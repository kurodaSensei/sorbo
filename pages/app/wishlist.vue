<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
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
