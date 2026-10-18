<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { WishlistInput, WishlistItem } from '~/types'

const { currentUser } = useAuth()
const wishlistStore = useWishlistStore()
const { confirm } = useConfirm()

// `ready` evita el flash del empty state mientras la lista aún carga.
const ready = ref(false)

onMounted(async () => {
  try {
    await wishlistStore.loadAll()
  }
  finally {
    ready.value = true
  }
})

async function refresh() {
  await wishlistStore.loadAll()
}

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

// Show only pending items in the main list (purchased/unavailable hidden by default)
const items = computed<WishlistItem[]>(() => {
  const list = (wishlistStore.list as WishlistItem[]) || []
  return list
    .filter(i => i.status !== 'purchased' && i.status !== 'unavailable')
    .sort((a, b) => {
      // Higher priority first, then newer first
      const pa = a.priority ?? 0
      const pb = b.priority ?? 0
      if (pa !== pb) return pb - pa
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
})

const search = ref('')

const isEmpty = computed(() => items.value.length === 0)

// Búsqueda por nombre del café o marca (roasterName) — mismo pattern
// que las 3 listas del tier 3.
const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(i =>
    (i.coffeeName || '').toLowerCase().includes(q)
    || (i.roasterName || '').toLowerCase().includes(q),
  )
})

const isFilteredEmpty = computed(() => !isEmpty.value && filteredItems.value.length === 0)

// ─────────────────────────────────────────────────────────────────────────────
// Priority bucketing (5-level numeric in storage → 3-level UI: alta/media/baja)
// ─────────────────────────────────────────────────────────────────────────────

type PriorityBucket = 'high' | 'medium' | 'low'

const PRIORITY_LABELS: Record<PriorityBucket, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

function bucketOf(priority: number | undefined | null): PriorityBucket {
  const p = priority ?? 3
  if (p >= 4) return 'high'
  if (p >= 2) return 'medium'
  return 'low'
}

function priorityValue(b: PriorityBucket): number {
  return b === 'high' ? 5 : b === 'medium' ? 3 : 1
}

const PRIORITY_PILL: Record<PriorityBucket, string> = {
  high: 'bg-olive text-paper',
  medium: 'bg-surface-2 text-moss',
  low: 'bg-transparent text-moss-soft border border-moss/15',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function relativeAge(ts: any): string {
  if (!ts) return ''
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : 0)
  if (!ms) return ''
  const diffD = (Date.now() - ms) / 1000 / 86400
  if (diffD < 1) return 'hoy'
  if (diffD < 2) return 'ayer'
  if (diffD < 14) return `hace ${Math.round(diffD)} días`
  const diffW = diffD / 7
  if (diffW < 8) return `hace ${Math.round(diffW)} ${Math.round(diffW) === 1 ? 'semana' : 'semanas'}`
  const diffM = diffD / 30
  return `hace ${Math.round(diffM)} ${Math.round(diffM) === 1 ? 'mes' : 'meses'}`
}

function rowEyebrow(i: WishlistItem): string {
  return (i.roasterName || 'Café').toUpperCase()
}

function cleanName(name: string): string {
  const t = (name || '').trim().replace(/\.+$/, '')
  return `${t}.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail sheet
// ─────────────────────────────────────────────────────────────────────────────

const detailOpen = ref(false)
const activeItem = ref<WishlistItem | null>(null)

function openDetail(i: WishlistItem) {
  activeItem.value = i
  detailOpen.value = true
}

async function markPurchased() {
  if (!activeItem.value) return
  try {
    await wishlistStore.changeStatus(activeItem.value.id, 'purchased')
    detailOpen.value = false
  }
  catch {
    // toast surfaced
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New / edit sheet
// ─────────────────────────────────────────────────────────────────────────────

const formOpen = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  coffeeName: '',
  roasterName: '',
  notes: '',
  priorityBucket: 'medium' as PriorityBucket,
})

const formErrors = ref<{ coffeeName?: string }>({})
const submitting = ref(false)

function openCreate() {
  editingId.value = null
  form.value = {
    coffeeName: '',
    roasterName: '',
    notes: '',
    priorityBucket: 'medium',
  }
  formErrors.value = {}
  detailOpen.value = false
  formOpen.value = true
}

function openEdit() {
  if (!activeItem.value) return
  editingId.value = activeItem.value.id
  form.value = {
    coffeeName: activeItem.value.coffeeName || '',
    roasterName: activeItem.value.roasterName || '',
    notes: activeItem.value.notes || '',
    priorityBucket: bucketOf(activeItem.value.priority),
  }
  formErrors.value = {}
  detailOpen.value = false
  formOpen.value = true
}

async function submit() {
  if (submitting.value) return
  formErrors.value = {}
  if (!form.value.coffeeName.trim()) {
    formErrors.value.coffeeName = 'El nombre del café es obligatorio'
    return
  }
  submitting.value = true
  try {
    const payload: WishlistInput = {
      coffeeName: form.value.coffeeName.trim(),
      roasterName: form.value.roasterName.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
      priority: priorityValue(form.value.priorityBucket),
      status: 'pending',
    } as WishlistInput

    if (editingId.value) {
      await wishlistStore.update(editingId.value, payload)
    }
    else {
      await wishlistStore.create(payload)
    }
    formOpen.value = false
  }
  catch {
    // toast surfaced
  }
  finally {
    submitting.value = false
  }
}

async function deleteItem() {
  if (!editingId.value) return
  const ok = await confirm({
    title: 'Eliminar de wishlist',
    message: 'Quitarás este café de tu lista de pendientes.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await wishlistStore.remove(editingId.value)
    formOpen.value = false
  }
  catch {
    // toast surfaced
  }
}

// ─── Quiero probar v3 (interruptor «social») ───────────────────────────────
// Misma lógica; agrupada por prioridad, detalle al lado en escritorio y
// «Ya lo probé» abre la nota rápida con este café.
const v3 = useFlag('social')
// «Ya lo probé» abre la nota rápida, que solo existe con el interruptor «catas».
const quickNote = useFlag('catas')
const router = useRouter()
const isDesktop = useMediaQuery('(min-width: 1024px)')

const v3Groups = computed(() => (['high', 'medium', 'low'] as PriorityBucket[])
  .map(b => ({ bucket: b, label: `Prioridad ${PRIORITY_LABELS[b].toLowerCase()}`, items: filteredItems.value.filter(i => bucketOf(i.priority) === b) }))
  .filter(g => g.items.length))

// En escritorio el primero queda elegido para que el panel no esté vacío.
watch([isDesktop, filteredItems], () => {
  if (v3.value && isDesktop.value && !formOpen.value && (!activeItem.value || !filteredItems.value.some(i => i.id === activeItem.value!.id)))
    activeItem.value = filteredItems.value[0] ?? null
}, { immediate: true })

function v3Open(i: WishlistItem) {
  activeItem.value = i
  formOpen.value = false
  detailOpen.value = !isDesktop.value
}
function v3Tasted() {
  if (activeItem.value) router.push(`/app/tastings/new?wish=${activeItem.value.id}`)
}
async function v3Delete() {
  const item = activeItem.value
  if (!item) return
  const ok = await confirm({ title: 'Quitar de Quiero probar', message: `«${item.coffeeName}» saldrá de tu lista.`, confirmLabel: 'Quitar', destructive: true })
  if (!ok) return
  try {
    await wishlistStore.remove(item.id)
    detailOpen.value = false
    activeItem.value = null
  }
  catch { /* el store ya avisa */ }
}
function v3Close() {
  detailOpen.value = false
  formOpen.value = false
}
function onSheetKey(e: KeyboardEvent) {
  if (e.key === 'Escape') v3Close()
}
const PRIORITY_DOT: Record<PriorityBucket, string> = { high: 'var(--accent)', medium: 'var(--tint)', low: 'var(--line-strong)' }
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div v-if="v3" class="v3 wish">
      <header class="head">
        <div class="head-row">
          <NuxtLink to="/app/coffees" class="back"><Icon name="lucide:arrow-left" size="22" />Cafés</NuxtLink>
          <span class="v3-eyebrow head-eb">— Quiero probar · {{ items.length }}</span>
        </div>
        <div class="title-row">
          <div class="title-text">
            <h1 class="title">Quiero <span class="v3-accent-word">probar</span></h1>
            <p class="v3-subtitle sub">Los cafés que te quedan por conseguir.</p>
          </div>
          <button type="button" class="v3-btn v3-btn--primary new-btn" @click="openCreate">
            <Icon name="lucide:plus" size="18" /><span class="mobile-only">Agregar</span><span class="desktop-only">Agregar café</span>
          </button>
        </div>
      </header>

      <div class="layout">
        <div class="list-col">
          <div v-if="!isEmpty" class="search">
            <Icon name="lucide:search" size="18" class="search-icon" />
            <label for="wl-search" class="sr-only">Buscar en Quiero probar</label>
            <input id="wl-search" v-model="search" type="search" class="v3-input search-input" placeholder="Café o marca" autocomplete="off">
          </div>
          <div v-if="!ready" class="list" aria-busy="true"><div v-for="n in 3" :key="n" class="row"><UiSkeleton class="h-5 w-2/3" /></div></div>
          <div v-else-if="isEmpty" class="empty">
            <p class="empty-text">Aún no tienes cafés por probar. Guarda los que veas en Explora o agrégalos tú.</p>
            <button type="button" class="v3-btn v3-btn--primary" @click="openCreate">Agregar café</button>
          </div>
          <p v-else-if="isFilteredEmpty" class="empty-text">Ningún café coincide con tu búsqueda.</p>
          <template v-else>
          <section v-for="g in v3Groups" :key="g.bucket" class="group" :aria-label="g.label">
            <h2 class="group-label"><span class="dot" :style="{ background: PRIORITY_DOT[g.bucket] }" aria-hidden="true" />{{ g.label }} · {{ g.items.length }}</h2>
            <div class="list">
              <button
                v-for="i in g.items"
                :key="i.id"
                type="button"
                :class="['row', { 'row--on': isDesktop && activeItem?.id === i.id && !formOpen }]"
                :aria-current="isDesktop && activeItem?.id === i.id ? 'true' : undefined"
                @click="v3Open(i)"
              >
                <span class="row-text">
                  <span class="row-name">{{ i.coffeeName.replace(/\.+$/, '') }}</span>
                  <span class="v3-meta">{{ [i.roasterName ? `de ${i.roasterName}` : '', relativeAge(i.createdAt)].filter(Boolean).join(' · ') }}</span>
                  <span v-if="i.notes" class="row-note">«{{ i.notes }}»</span>
                </span>
                <Icon name="lucide:chevron-right" size="18" class="chev" />
              </button>
            </div>
          </section>
          </template>
        </div>

        <section v-if="isDesktop && (formOpen || activeItem)" class="panel" aria-labelledby="wl-panel-title">
          <template v-if="formOpen">
            <template v-for="headingId in ['wl-panel-title']" :key="headingId">
              <h2 :id="headingId" class="f-title">{{ editingId ? 'Editar' : 'Agrega un' }} <span class="v3-accent-word">café</span></h2>
          <form class="f" novalidate @submit.prevent="submit">
            <V3Field v-model="form.coffeeName" label="Café" placeholder="Geisha Esmeralda" :error="formErrors.coffeeName" />
            <V3Field v-model="form.roasterName" label="Marca u origen · opcional" placeholder="Hartmann, Panamá" />
            <div class="f-field">
              <label :for="`${headingId}-why`" class="v3-label">Por qué lo quieres <span class="opt">· opcional</span></label>
              <textarea :id="`${headingId}-why`" v-model="form.notes" rows="3" class="v3-input f-why" placeholder="Escuché que es un floral brutal…" />
            </div>
            <fieldset class="f-prio">
              <legend class="v3-label legend">Prioridad</legend>
              <span class="seg">
                <button v-for="b in (['low', 'medium', 'high'] as PriorityBucket[])" :key="b" type="button" :class="['seg-btn', { 'seg-btn--on': form.priorityBucket === b }]" :aria-pressed="form.priorityBucket === b" @click="form.priorityBucket = b">{{ PRIORITY_LABELS[b] }}</button>
              </span>
            </fieldset>
            <button type="submit" class="v3-btn v3-btn--primary" :disabled="submitting" :aria-busy="submitting || undefined">
              <span v-if="submitting" class="v3-spinner" aria-hidden="true" />{{ editingId ? 'Guardar cambios' : 'Agregar a Quiero probar' }}
            </button>
            <button v-if="editingId" type="button" class="v3-btn plain danger" @click="deleteItem">Quitar de la lista</button>
          </form>
            </template>
          </template>
          <template v-else-if="activeItem">
            <template v-for="headingId in ['wl-panel-title']" :key="headingId">
              <div class="d-head">
            <span class="d-prio"><span class="dot" :style="{ background: PRIORITY_DOT[bucketOf(activeItem.priority)] }" aria-hidden="true" />Prioridad {{ PRIORITY_LABELS[bucketOf(activeItem.priority)].toLowerCase() }}</span>
            <h2 :id="headingId" class="d-name">{{ activeItem.coffeeName.replace(/\.+$/, '') }}</h2>
            <p v-if="activeItem.roasterName" class="d-sub">de {{ activeItem.roasterName }}</p>
          </div>
          <blockquote v-if="activeItem.notes" class="d-why">«{{ activeItem.notes }}»</blockquote>
          <dl class="d-specs">
            <div class="d-spec"><dt>Lo agregaste</dt><dd>{{ relativeAge(activeItem.createdAt) }}</dd></div>
            <div v-if="activeItem.variety" class="d-spec"><dt>Variedad</dt><dd>{{ activeItem.variety }}</dd></div>
          </dl>
          <div class="d-actions">
            <button type="button" class="v3-btn v3-btn--primary" @click="markPurchased"><Icon name="lucide:check" size="18" />Lo conseguí</button>
            <button v-if="quickNote" type="button" class="v3-btn v3-btn--secondary tasted" @click="v3Tasted">Ya lo probé: anotar una cata</button>
            <span class="d-row"><button type="button" class="v3-btn plain" @click="openEdit">Editar</button><button type="button" class="v3-btn plain danger" @click="v3Delete">Quitar</button></span>
          </div>
            </template>
          </template>
        </section>
      </div>

      <Teleport to="body">
        <Transition name="v3-sheet">
          <div v-if="!isDesktop && ((detailOpen && activeItem) || formOpen)" class="v3 v3-sheet-wrap" @keydown="onSheetKey">
            <div class="v3-sheet-veil" aria-hidden="true" @click="v3Close" />
            <section role="dialog" aria-modal="true" aria-labelledby="wl-sheet-title" class="v3-sheet wl-sheet">
              <span class="v3-sheet-handle" aria-hidden="true" />
              <div class="sheet-top">
                <span class="v3-eyebrow head-eb">— {{ formOpen ? (editingId ? 'Editar' : 'Nuevo deseo') : 'Quiero probar' }}</span>
                <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="v3Close"><Icon name="lucide:x" size="20" /></button>
              </div>
              <div class="sheet-body">
                <template v-for="headingId in ['wl-sheet-title']" :key="headingId">
                  <template v-if="formOpen">
                    <h2 :id="headingId" class="f-title">{{ editingId ? 'Editar' : 'Agrega un' }} <span class="v3-accent-word">café</span></h2>
          <form class="f" novalidate @submit.prevent="submit">
            <V3Field v-model="form.coffeeName" label="Café" placeholder="Geisha Esmeralda" :error="formErrors.coffeeName" />
            <V3Field v-model="form.roasterName" label="Marca u origen · opcional" placeholder="Hartmann, Panamá" />
            <div class="f-field">
              <label :for="`${headingId}-why`" class="v3-label">Por qué lo quieres <span class="opt">· opcional</span></label>
              <textarea :id="`${headingId}-why`" v-model="form.notes" rows="3" class="v3-input f-why" placeholder="Escuché que es un floral brutal…" />
            </div>
            <fieldset class="f-prio">
              <legend class="v3-label legend">Prioridad</legend>
              <span class="seg">
                <button v-for="b in (['low', 'medium', 'high'] as PriorityBucket[])" :key="b" type="button" :class="['seg-btn', { 'seg-btn--on': form.priorityBucket === b }]" :aria-pressed="form.priorityBucket === b" @click="form.priorityBucket = b">{{ PRIORITY_LABELS[b] }}</button>
              </span>
            </fieldset>
            <button type="submit" class="v3-btn v3-btn--primary" :disabled="submitting" :aria-busy="submitting || undefined">
              <span v-if="submitting" class="v3-spinner" aria-hidden="true" />{{ editingId ? 'Guardar cambios' : 'Agregar a Quiero probar' }}
            </button>
            <button v-if="editingId" type="button" class="v3-btn plain danger" @click="deleteItem">Quitar de la lista</button>
          </form>
                  </template>
                  <template v-else-if="activeItem">
                    <div class="d-head">
            <span class="d-prio"><span class="dot" :style="{ background: PRIORITY_DOT[bucketOf(activeItem.priority)] }" aria-hidden="true" />Prioridad {{ PRIORITY_LABELS[bucketOf(activeItem.priority)].toLowerCase() }}</span>
            <h2 :id="headingId" class="d-name">{{ activeItem.coffeeName.replace(/\.+$/, '') }}</h2>
            <p v-if="activeItem.roasterName" class="d-sub">de {{ activeItem.roasterName }}</p>
          </div>
          <blockquote v-if="activeItem.notes" class="d-why">«{{ activeItem.notes }}»</blockquote>
          <dl class="d-specs">
            <div class="d-spec"><dt>Lo agregaste</dt><dd>{{ relativeAge(activeItem.createdAt) }}</dd></div>
            <div v-if="activeItem.variety" class="d-spec"><dt>Variedad</dt><dd>{{ activeItem.variety }}</dd></div>
          </dl>
          <div class="d-actions">
            <button type="button" class="v3-btn v3-btn--primary" @click="markPurchased"><Icon name="lucide:check" size="18" />Lo conseguí</button>
            <button v-if="quickNote" type="button" class="v3-btn v3-btn--secondary tasted" @click="v3Tasted">Ya lo probé: anotar una cata</button>
            <span class="d-row"><button type="button" class="v3-btn plain" @click="openEdit">Editar</button><button type="button" class="v3-btn plain danger" @click="v3Delete">Quitar</button></span>
          </div>
                  </template>
                </template>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </div>

    <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>Wishlist · {{ items.length }}</UiEyebrow>
      <div class="lg:hidden inline-flex items-center gap-sm">
        <UiNotificationBell size="sm" />
        <NuxtLink to="/app/settings" class="inline-flex">
          <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
        </NuxtLink>
      </div>
    </header>

    <div class="mt-lg flex items-end justify-between gap-md flex-wrap">
      <div>
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px] lg:text-[64px]">
          Tu <span class="italic text-olive">wishlist</span>
        </h1>
        <p class="subtitle-italic mt-xs">
          Los que vas a perseguir.
        </p>
      </div>
      <UiButton
        variant="primary"
        :block="false"
        size="sm"
        class="hidden lg:inline-flex"
        @click="openCreate"
      >
        + Nuevo deseo
      </UiButton>
    </div>

    <!-- Empty — solo después de la primera carga. -->
    <!-- Skeletons mientras carga -->
    <div
      v-if="!ready"
      class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
      aria-busy="true"
    >
      <div
        v-for="n in 4"
        :key="`skel-${n}`"
        class="rounded-card-lg bg-surface-2 p-md flex flex-col gap-xs"
      >
        <UiSkeleton class="h-3 w-24" />
        <UiSkeleton class="h-6 w-1/2 rounded-card mt-xxs" />
        <UiSkeleton class="h-3 w-3/4 mt-xs" />
      </div>
    </div>

    <div v-if="isEmpty && ready" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[340px] rounded-card-lg bg-surface px-lg py-2xl text-center">
        <p class="font-display italic text-[16px] text-moss leading-relaxed">
          "Tu próximo café favorito empieza siendo un deseo."
        </p>
      </div>
      <UiButton variant="primary" :block="false" @click="openCreate">
        + Nuevo deseo
      </UiButton>
    </div>

    <!-- Search (solo cuando hay items) -->
    <UiListSearch
      v-if="!isEmpty"
      v-model="search"
      placeholder="Buscar por café o marca…"
      class="mt-md"
    />

    <!-- Empty por filtro -->
    <div v-if="isFilteredEmpty" class="mt-xl text-center">
      <p class="font-display italic text-[14px] text-moss-soft">
        Nada coincide con "{{ search }}".
      </p>
    </div>

    <!-- List -->
    <ul v-else class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md">
      <li v-for="i in filteredItems" :key="i.id">
        <button
          type="button"
          class="w-full text-left rounded-card-lg bg-surface-2 p-md transition-colors duration-150 ease-sorbo hover:bg-surface"
          @click="openDetail(i)"
        >
          <div class="flex items-start justify-between gap-md">
            <UiEyebrow>{{ rowEyebrow(i) }}</UiEyebrow>
            <span
              :class="[
                'inline-flex items-center rounded-pill px-sm h-[24px] font-mono text-[10px] font-medium uppercase tracking-eyebrow',
                PRIORITY_PILL[bucketOf(i.priority)],
              ]"
            >
              {{ PRIORITY_LABELS[bucketOf(i.priority)] }}
            </span>
          </div>
          <div class="mt-xs font-display text-[28px] sm:text-[32px] leading-[1.05] tracking-[-0.01em] text-moss truncate">
            {{ cleanName(i.coffeeName) }}
          </div>
          <p v-if="i.notes" class="mt-xs font-display italic text-[14px] text-moss-soft line-clamp-2">
            "{{ i.notes }}"
          </p>
        </button>
      </li>
    </ul>

    <!-- Mobile FAB (only when list has items) -->
    <button
      v-if="!isEmpty"
      type="button"
      class="lg:hidden fixed bottom-[96px] right-md z-20 inline-flex size-[56px] items-center justify-center rounded-pill bg-olive text-paper shadow-[0_8px_24px_rgba(47,53,40,0.18)] transition-transform duration-150 ease-sorbo hover:-translate-y-[2px]"
      aria-label="Nuevo deseo"
      @click="openCreate"
    >
      <Icon name="lucide:plus" class="size-6" />
    </button>

    <!-- ━━━━━━━━━━ DETAIL SHEET ━━━━━━━━━━ -->
    <UiBottomSheet v-model="detailOpen">
      <div v-if="activeItem" class="flex flex-col gap-md">
        <UiEyebrow>Wishlist</UiEyebrow>

        <span
          :class="[
            'inline-flex self-start items-center rounded-pill px-sm h-[26px] font-mono text-[10px] font-medium uppercase tracking-eyebrow',
            PRIORITY_PILL[bucketOf(activeItem.priority)],
          ]"
        >
          Prioridad {{ PRIORITY_LABELS[bucketOf(activeItem.priority)] }}
        </span>

        <h2 class="font-display tracking-[-0.02em] leading-[0.95] text-moss text-[44px] sm:text-[56px] break-words">
          <template v-if="activeItem.coffeeName.includes(' ')">
            {{ activeItem.coffeeName.split(' ').slice(0, -1).join(' ') }}<br>
            <span class="italic text-olive">{{ activeItem.coffeeName.split(' ').slice(-1)[0] }}</span>
          </template>
          <template v-else>
            <span class="italic text-olive">{{ activeItem.coffeeName }}</span>
          </template>
        </h2>

        <p v-if="activeItem.roasterName" class="subtitle-italic">
          de {{ activeItem.roasterName }}
        </p>

        <div v-if="activeItem.notes" class="rounded-card-sm bg-surface-2 p-md flex flex-col gap-xs">
          <UiEyebrow>Por qué</UiEyebrow>
          <p class="font-display italic text-[15px] leading-relaxed text-moss">
            "{{ activeItem.notes }}"
          </p>
        </div>

        <div class="flex flex-col">
          <UiSpecRow label="Agregado">
            {{ relativeAge(activeItem.createdAt) }}
          </UiSpecRow>
          <UiSpecRow v-if="activeItem.variety" label="Variedad">
            {{ activeItem.variety }}
          </UiSpecRow>
        </div>

        <div class="flex gap-xs pt-sm">
          <UiButton variant="primary" :block="true" @click="markPurchased">
            ✓ Lo conseguí
          </UiButton>
          <UiButton variant="secondary" :block="true" @click="openEdit">
            Editar
          </UiButton>
        </div>
      </div>
    </UiBottomSheet>

    <!-- ━━━━━━━━━━ NEW / EDIT SHEET ━━━━━━━━━━ -->
    <UiBottomSheet v-model="formOpen">
      <div class="flex flex-col gap-md">
        <UiEyebrow>{{ editingId ? 'Editar deseo' : 'Nuevo deseo' }}</UiEyebrow>

        <h2 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          <template v-if="editingId">
            Editar <span class="italic text-olive">deseo</span>
          </template>
          <template v-else>
            Agrega un <span class="italic text-olive">café</span>
          </template>
        </h2>

        <div class="flex flex-col gap-xs">
          <UiInput
            v-model="form.coffeeName"
            label="Nombre"
            placeholder="Geisha Esmeralda"
            :error="formErrors.coffeeName"
          />
          <UiInput
            v-model="form.roasterName"
            label="Marca / origen"
            placeholder="Hartmann, Panamá"
          />

          <div class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10 transition-colors duration-150 ease-sorbo"
               :class="form.notes ? 'border-moss' : 'border-moss/10'">
            <label class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
              <span aria-hidden="true">— </span>Por qué
            </label>
            <textarea
              v-model="form.notes"
              rows="2"
              placeholder="Escuché que es un floral brutal…"
              class="w-full bg-transparent border-0 p-0 outline-none resize-none font-display italic text-[18px] text-moss placeholder:text-moss-ghost"
            />
          </div>

          <div class="flex flex-col gap-xs pt-md">
            <UiEyebrow>Prioridad</UiEyebrow>
            <div class="flex flex-wrap gap-xxs">
              <UiChip
                v-for="b in (['high', 'medium', 'low'] as const)"
                :key="b"
                interactive
                :variant="form.priorityBucket === b ? 'active' : 'default'"
                @click="form.priorityBucket = b"
              >
                {{ PRIORITY_LABELS[b] }}
              </UiChip>
            </div>
          </div>
        </div>

        <UiButton
          variant="primary"
          class="mt-md"
          :loading="submitting"
          @click="submit"
        >
          {{ editingId ? 'Guardar cambios' : '+ Agregar a wishlist' }}
        </UiButton>
        <UiButton
          v-if="editingId"
          variant="ghost"
          @click="deleteItem"
        >
          <span class="text-terracotta">Eliminar de wishlist</span>
        </UiButton>
      </div>
    </UiBottomSheet>
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.wish { box-sizing: border-box; max-width: 1180px; padding: 8px 20px 32px; display: flex; flex-direction: column; gap: 20px; background: transparent; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.desktop-only { display: none !important; }
.head { display: flex; flex-direction: column; gap: 14px; }
.head-row { display: flex; align-items: center; justify-content: space-between; }
.head-eb { color: var(--ink-soft); }
.back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; color: var(--ink); text-decoration: none; font: 600 15px/20px var(--font-sans); }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.title-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.new-btn { flex: none; height: 40px; padding: 0 14px; font-size: 13px; gap: 6px; }
.layout, .list-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.search { position: relative; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-label { margin: 0; display: flex; align-items: center; gap: 8px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.dot { flex: none; width: 10px; height: 10px; border-radius: 50%; }
.list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.row { display: flex; align-items: center; gap: 12px; min-height: 72px; padding: 10px 0; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.row:last-child { border-bottom: 0; }
.row--on { box-shadow: -14px 0 0 var(--surface-strong), 14px 0 0 var(--surface-strong); background: var(--surface-strong); }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-name { font: 400 20px/24px var(--font-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-note { font: italic 400 14px/20px var(--font-display); color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chev { flex: none; color: var(--ink-soft); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; text-align: center; }
.empty-text { margin: 0; max-width: 340px; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }
.wl-sheet { gap: 0; }
.sheet-top { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px 0 20px; }
.sheet-body { overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 4px 20px calc(24px + env(safe-area-inset-bottom)); }
.d-head { display: flex; flex-direction: column; gap: 6px; }
.d-prio { display: flex; align-items: center; gap: 8px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.d-name { margin: 0; font: 400 40px/0.98 var(--font-display); letter-spacing: -0.02em; overflow-wrap: anywhere; }
.d-sub { margin: 0; font: italic 400 17px/22px var(--font-display); }
.d-why { margin: 0; padding: 14px 16px; border-radius: 16px; background: var(--surface); font: italic 400 18px/26px var(--font-display); }
.d-specs { margin: 0; display: flex; flex-direction: column; }
.d-spec { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.d-spec:last-child { border-bottom: 0; }
.d-spec dt { font: 400 15px/22px var(--font-sans); color: var(--ink-soft); }
.d-spec dd { margin: 0; font: 500 15px/22px var(--font-sans); }
.d-actions { display: flex; flex-direction: column; gap: 8px; }
.d-row { display: flex; gap: 8px; }
.d-row .v3-btn { flex: 1; }
.plain { background: transparent; color: var(--ink); }
.plain:hover { background: var(--surface); }
.danger { color: var(--danger); }
.f-title { margin: 0; font: 400 30px/32px var(--font-display); }
.f { display: flex; flex-direction: column; gap: 16px; }
.f-field { display: flex; flex-direction: column; gap: 8px; }
.opt { font-weight: 400; }
.f-why { min-height: 96px; resize: vertical; font-style: italic; }
.f-prio { margin: 0; padding: 0; border: 0; }
.legend { padding: 0 0 8px; }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg-btn { height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 14px/18px var(--font-sans); cursor: pointer; }
.seg-btn--on { background: var(--bg); font-weight: 600; }

@media (min-width: 1024px) {
  .wish { padding: 32px 48px 64px; gap: 24px; }
  .mobile-only { display: none !important; }
  .desktop-only { display: inline !important; }
  .head-row .head-eb { display: none; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .new-btn { height: 48px; padding: 0 18px; font-size: 15px; gap: 8px; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .list-col { flex: 1 1 380px; }
  .panel { flex: 1 1 380px; min-width: 0; position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; padding: 28px; border-radius: 24px; background: var(--surface-strong); }
  .panel .d-why, .panel .seg, .panel :deep(.input), .panel .v3-input { background: var(--bg); }
}
</style>
