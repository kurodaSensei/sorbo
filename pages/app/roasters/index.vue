<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Roaster, RoasterInput } from '~/types'

const router = useRouter()
const roastersStore = useRoastersStore()
const coffeesStore = useCoffeesStore()
const { confirm } = useConfirm()

// `ready` evita el flash del empty state ("Detrás de cada taza...")
// mientras la lista aún carga.
const ready = ref(false)

onMounted(async () => {
  coffeesStore.loadAll().catch(() => {})
  try {
    await roastersStore.loadAll()
  }
  finally {
    ready.value = true
  }
})

const search = ref('')

const filtered = computed<Roaster[]>(() => {
  const list = (roastersStore.list as Roaster[]) || []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    r =>
      (r.name || '').toLowerCase().includes(q)
      || (r.city || '').toLowerCase().includes(q)
      || (r.country || '').toLowerCase().includes(q),
  )
})

function coffeesCount(roasterId: string): number {
  return (coffeesStore.list as { roasterId?: string }[]).filter(c => c.roasterId === roasterId).length
}

function avatarTone(name: string): 'olive' | 'honey' | 'jungle' {
  // simple deterministic pick based on first char.
  // No 'surface' aquí: las cards son bg-surface y el avatar surface se difumina.
  const c = (name || '?').charCodeAt(0)
  const tones: Array<'olive' | 'honey' | 'jungle'> = ['olive', 'honey', 'jungle']
  return tones[c % tones.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom sheet form (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

const sheetOpen = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  name: '',
  country: 'Colombia',
  city: '',
  website: '',
  instagram: '',
  rating: null as number | null,
  // `roasts` default true para que las marcas históricas (la mayoría sí
  // tuestan) no se vean afectadas. Solo se marca false explícitamente
  // cuando es reseller / café tienda / marca de supermercado.
  roasts: true,
})

const formErrors = ref<{ name?: string; country?: string }>({})
const submitting = ref(false)

function openCreate() {
  editingId.value = null
  form.value = {
    name: '',
    country: 'Colombia',
    city: '',
    website: '',
    instagram: '',
    rating: null,
    roasts: true,
  }
  formErrors.value = {}
  sheetOpen.value = true
}

function openEdit(r: Roaster) {
  editingId.value = r.id
  form.value = {
    name: r.name || '',
    country: r.country || 'Colombia',
    city: r.city || '',
    website: r.website || '',
    instagram: r.instagram || '',
    rating: r.rating ?? null,
    // undefined se trata como true (compat con documentos existentes).
    roasts: r.roasts !== false,
  }
  formErrors.value = {}
  sheetOpen.value = true
}

function validateForm(): boolean {
  formErrors.value = {}
  if (!form.value.name.trim()) formErrors.value.name = 'El nombre es obligatorio'
  if (!form.value.country.trim()) formErrors.value.country = 'El país es obligatorio'
  return Object.keys(formErrors.value).length === 0
}

async function save() {
  if (submitting.value || !validateForm()) return
  submitting.value = true
  try {
    const payload: RoasterInput = {
      name: form.value.name.trim(),
      country: form.value.country.trim(),
      city: form.value.city.trim() || undefined,
      website: form.value.website.trim() || undefined,
      instagram: form.value.instagram.trim() || undefined,
      rating: form.value.rating ?? undefined,
      // Solo persistimos `roasts` cuando es false — true es el default
      // implícito (documentos sin el campo ya cuentan como "tuesta").
      roasts: form.value.roasts ? undefined : false,
    } as RoasterInput

    if (editingId.value) {
      await roastersStore.update(editingId.value, payload as Partial<Roaster>)
    }
    else {
      await roastersStore.create(payload)
    }
    sheetOpen.value = false
  }
  catch {
    // toast surfaced by store
  }
  finally {
    submitting.value = false
  }
}

async function deleteRoaster() {
  if (!editingId.value) return
  const ok = await confirm({
    title: 'Eliminar marca',
    message: 'Los cafés asociados conservarán su nombre actual.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await roastersStore.remove(editingId.value)
    sheetOpen.value = false
  }
  catch {
    // toast
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Marcas v3 (interruptor «catalogos»). Misma lógica de arriba: en móvil el
// formulario va en una hoja; en escritorio, en el panel de detalle.
// ─────────────────────────────────────────────────────────────────────────────
const v3 = useFlag('catalogos')
const isDesktop = useMediaQuery('(min-width: 1024px)')

const AVATAR_TONES = [
  { bg: 'var(--tint)', fg: 'var(--on-tint)' },
  { bg: 'var(--accent)', fg: 'var(--on-accent)' },
  { bg: 'var(--brand-surface)', fg: 'var(--on-brand-surface)' },
]
const toneFor = (name: string) => AVATAR_TONES[(name || '?').charCodeAt(0) % AVATAR_TONES.length]

const rows = computed(() =>
  filtered.value.map((r) => {
    const n = coffeesCount(r.id)
    return {
      roaster: r,
      initial: (r.name || '?').charAt(0).toUpperCase(),
      tone: toneFor(r.name),
      meta: [[r.city, r.country].filter(Boolean).join(' · '), r.roasts === true ? 'Tuesta su café' : ''].filter(Boolean).join(' · '),
      coffees: `${n} ${n === 1 ? 'café' : 'cafés'}`,
      rating: typeof r.rating === 'number' ? r.rating.toFixed(1) : null,
    }
  }),
)

const selected = computed(() => (roastersStore.list as Roaster[]).find(r => r.id === editingId.value) ?? null)

// En escritorio, abre la primera marca para que el panel no arranque vacío.
watch([isDesktop, () => filtered.value.length, ready], () => {
  if (v3.value && isDesktop.value && ready.value && !sheetOpen.value && filtered.value[0])
    openEdit(filtered.value[0])
})

function onSheetKey(e: KeyboardEvent) {
  if (e.key === 'Escape') sheetOpen.value = false
}
</script>

<template>
  <div v-if="v3" class="v3 roasters">
    <header class="head">
      <div class="head-row">
        <button type="button" class="back" aria-label="Volver" @click="router.back()">
          <Icon name="lucide:arrow-left" size="22" />
          <span class="back-label">Ajustes</span>
        </button>
        <button type="button" class="v3-btn v3-btn--primary new-btn" @click="openCreate">
          <Icon name="lucide:plus" size="18" /> Nueva marca
        </button>
      </div>
      <h1 class="title">Tus <span class="v3-accent-word">marcas</span></h1>
      <p class="v3-subtitle sub">Tostadores, tiendas o lo que diga la bolsa.</p>
    </header>

    <div class="layout">
      <section aria-label="Lista de marcas" class="list-col">
        <div class="search">
          <Icon name="lucide:search" size="18" class="search-icon" />
          <label for="roaster-search" class="sr-only">Buscar marca</label>
          <input id="roaster-search" v-model="search" type="search" placeholder="Buscar marca" class="search-input">
        </div>

        <div v-if="rows.length" class="list">
          <button
            v-for="row in rows"
            :key="row.roaster.id"
            type="button"
            :class="['row', { 'row--on': isDesktop && sheetOpen && editingId === row.roaster.id }]"
            :aria-current="isDesktop && editingId === row.roaster.id ? 'true' : undefined"
            @click="openEdit(row.roaster)"
          >
            <span class="avatar" aria-hidden="true" :style="{ background: row.tone.bg, color: row.tone.fg }">{{ row.initial }}</span>
            <span class="row-text">
              <span class="row-name">{{ row.roaster.name }}</span>
              <span class="v3-meta">{{ row.meta || '—' }}</span>
            </span>
            <span class="row-side">
              <span v-if="row.rating" class="row-rating">{{ row.rating }}<span class="row-max">/5</span></span>
              <span class="row-count">{{ row.coffees }}</span>
            </span>
          </button>
        </div>

        <div v-else-if="ready || search" class="empty">
          <p class="empty-text">
            <template v-if="search">No encontramos marcas con ese nombre.</template>
            <template v-else>Detrás de cada taza hay una marca. Empecemos por la primera.</template>
          </p>
          <button v-if="!search" type="button" class="v3-btn v3-btn--primary" @click="openCreate">Nueva marca</button>
        </div>
      </section>

      <!-- Escritorio: detalle y edición al lado -->
      <section v-if="isDesktop" aria-labelledby="roaster-panel-title" class="panel">
        <template v-if="sheetOpen">
          <div class="panel-head">
            <span v-if="selected" class="avatar avatar--lg" aria-hidden="true" :style="{ background: toneFor(selected.name).bg, color: toneFor(selected.name).fg }">{{ (selected.name || '?').charAt(0).toUpperCase() }}</span>
            <div class="panel-title-wrap">
              <h2 id="roaster-panel-title" class="panel-title">{{ selected ? selected.name : 'Nueva marca' }}</h2>
              <span v-if="selected" class="v3-meta">{{ coffeesCount(selected.id) }} {{ coffeesCount(selected.id) === 1 ? 'café guardado' : 'cafés guardados' }}</span>
            </div>
          </div>
          <V3RoasterForm v-model="form" :editing="!!editingId" :errors="formErrors" :submitting="submitting" @save="save" @remove="deleteRoaster" />
        </template>
        <p v-else id="roaster-panel-title" class="panel-empty">Elige una marca para verla o editarla.</p>
      </section>
    </div>

    <!-- Móvil: hoja inferior -->
    <Teleport to="body">
      <Transition name="v3-sheet">
        <div v-if="!isDesktop && sheetOpen" class="v3 sheet-wrap" @keydown="onSheetKey">
          <div class="sheet-veil" aria-hidden="true" @click="sheetOpen = false" />
          <section role="dialog" aria-modal="true" aria-labelledby="roaster-sheet-title" class="sheet">
            <span class="sheet-handle" aria-hidden="true" />
            <div class="sheet-head">
              <h2 id="roaster-sheet-title" class="sheet-title">{{ editingId ? 'Editar marca' : 'Nueva marca' }}</h2>
              <button type="button" class="sheet-close" aria-label="Cerrar" @click="sheetOpen = false">
                <Icon name="lucide:x" size="20" />
              </button>
            </div>
            <V3RoasterForm v-model="form" :editing="!!editingId" :errors="formErrors" :submitting="submitting" @save="save" @remove="deleteRoaster" />
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>

  <div v-else class="mx-auto w-full max-w-[640px] px-md pt-md pb-2xl lg:px-xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>Catálogo</UiEyebrow>
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Nueva marca"
        @click="openCreate"
      >
        <Icon name="lucide:plus" class="size-5" />
      </button>
    </header>

    <h1 class="mt-md font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px]">
      Tus <span class="italic text-olive">marcas</span>
    </h1>
    <p class="subtitle-italic mt-xs">
      Tostadores, tiendas, o lo que diga la bolsa.
    </p>

    <!-- Search -->
    <div class="mt-lg">
      <UiListSearch v-model="search" placeholder="Buscar marca…" />
    </div>

    <!-- Empty state — solo después de la primera carga (o si hay búsqueda activa). -->
    <div v-if="filtered.length === 0 && (ready || search)" class="mt-2xl flex flex-col items-center gap-lg">
      <p class="font-display italic text-[15px] text-moss-soft text-center max-w-[280px]">
        <template v-if="search">No encontramos marcas con ese nombre.</template>
        <template v-else>"Detrás de cada taza hay una marca. Empecemos por la primera."</template>
      </p>
      <UiButton v-if="!search" variant="dark" :block="false" @click="openCreate">
        + Nueva marca
      </UiButton>
    </div>

    <!-- List -->
    <ul v-else class="mt-lg flex flex-col gap-sm">
      <li v-for="r in filtered" :key="r.id">
        <button
          type="button"
          class="w-full flex items-center gap-md rounded-card-sm bg-surface p-md text-left transition-colors duration-150 ease-sorbo hover:bg-surface-2"
          @click="openEdit(r)"
        >
          <UiAvatar :name="r.name" :tone="avatarTone(r.name)" size="md" />
          <div class="flex-1 min-w-0">
            <div class="font-sans text-[16px] font-medium text-moss truncate">{{ r.name }}</div>
            <UiEyebrow class="mt-xxs">
              {{ [r.city, r.country].filter(Boolean).join(' · ') || '—' }}
            </UiEyebrow>
            <!-- Badge sutil: solo aparece cuando la marca explícitamente
                 tuesta. Documentos sin el campo (la mayoría históricos) NO
                 muestran badge — el usuario decidirá si los flagea con
                 el toggle del sheet. -->
            <span
              v-if="r.roasts === true"
              class="mt-xxs inline-flex items-center gap-xxs font-mono text-[9px] font-medium uppercase tracking-eyebrow text-olive"
            >
              <span class="inline-block w-1 h-1 rounded-full bg-olive" aria-hidden="true" />
              Tuesta su café
            </span>
          </div>
          <div class="flex flex-col items-end gap-xxs shrink-0">
            <span v-if="r.rating !== undefined && r.rating !== null" class="font-display text-[18px] leading-none text-moss">
              {{ r.rating.toFixed(1) }}<span class="font-mono text-[10px] text-moss-soft">/5</span>
            </span>
            <UiEyebrow>
              {{ coffeesCount(r.id) }} {{ coffeesCount(r.id) === 1 ? 'café' : 'cafés' }}
            </UiEyebrow>
          </div>
        </button>
      </li>
    </ul>

    <!-- Bottom sheet form -->
    <UiBottomSheet v-model="sheetOpen" :title="editingId ? 'Editar marca' : 'Nueva marca'">
      <div class="flex flex-col gap-xs pt-xs">
        <UiInput v-model="form.name" label="Nombre" placeholder="Libertario" :error="formErrors.name" />
        <UiInput v-model="form.country" label="País" placeholder="Colombia" :error="formErrors.country" />
        <UiInput v-model="form.city" label="Ciudad" placeholder="Bogotá" />
        <UiInput v-model="form.website" label="Sitio web" placeholder="libertario.co" type="url" />
        <UiInput v-model="form.instagram" label="Instagram" placeholder="@libertario" />

        <!-- Toggle "Tuesta su café" — checkbox custom alineado al estilo
             del resto de campos. Default ON al crear. -->
        <label
          class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10 cursor-pointer"
        >
          <span class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
            <span aria-hidden="true">— </span>Tipo
          </span>
          <span class="flex items-center justify-between gap-md">
            <span class="flex flex-col gap-xxs">
              <span class="font-display text-[16px] text-moss leading-none">
                Tuesta su café
              </span>
              <span class="font-display italic text-[12px] text-moss-soft leading-tight">
                Desmárcalo si es tienda, reseller o marca que no tuesta.
              </span>
            </span>
            <span
              class="relative inline-flex shrink-0 w-[44px] h-[26px] rounded-full transition-colors"
              :class="form.roasts ? 'bg-olive' : 'bg-moss/15'"
            >
              <input
                v-model="form.roasts"
                type="checkbox"
                class="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Esta marca tuesta su café"
              >
              <span
                class="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-paper shadow-[0_1px_2px_rgba(47,53,40,0.25)] transition-all"
                :class="form.roasts ? 'left-[21px]' : 'left-[3px]'"
              />
            </span>
          </span>
        </label>

        <div class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10">
          <div class="flex items-baseline justify-between gap-md">
            <label for="rating" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
              <span aria-hidden="true">— </span>Rating
              <span class="lowercase normal-case font-display italic text-moss-soft">opcional · 0-5</span>
            </label>
            <span class="font-mono text-[12px] text-moss">
              {{ form.rating !== null ? form.rating.toFixed(1) : '—' }} /5
            </span>
          </div>
          <input
            id="rating"
            v-model.number="form.rating"
            type="range"
            min="0"
            max="5"
            step="0.1"
            class="mt-xs w-full accent-olive"
          >
        </div>
      </div>

      <div class="mt-xl flex flex-col gap-sm">
        <UiButton variant="primary" :loading="submitting" @click="save">
          {{ editingId ? 'Guardar cambios' : 'Crear marca' }}
        </UiButton>
        <UiButton v-if="editingId" variant="ghost" @click="deleteRoaster">
          <span class="text-terracotta">Eliminar marca</span>
        </UiButton>
      </div>
    </UiBottomSheet>
  </div>
</template>

<style scoped>
.roasters { box-sizing: border-box; max-width: 1060px; padding: 8px 20px 120px; display: flex; flex-direction: column; gap: 24px; }
.head { display: flex; flex-direction: column; gap: 8px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.new-btn { height: 40px; padding: 0 14px; font-size: 13px; line-height: 16px; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.layout { display: flex; flex-direction: column; gap: 24px; }
.list-col { display: flex; flex-direction: column; gap: 14px; }
.search { position: relative; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.search-input { box-sizing: border-box; width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: var(--surface); padding: 12px 16px 12px 42px; font: 400 16px/22px var(--font-sans); color: var(--ink); outline: none; }
.search-input::placeholder { color: var(--ink-soft); font-style: italic; }
.search-input:focus-visible { box-shadow: inset 0 0 0 2px var(--primary); }
.list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.row { display: flex; align-items: center; gap: 14px; min-height: 72px; padding: 0; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.row:last-child { border-bottom: 0; }
.avatar { flex: none; width: 44px; height: 44px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font: 400 20px/1 var(--font-display); }
.avatar--lg { width: 56px; height: 56px; font-size: 26px; }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-name { font: 400 19px/22px var(--font-display); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-side { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.row-rating { font: 400 19px/20px var(--font-display); }
.row-max { font-size: 12px; color: var(--ink-soft); }
.row-count { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 16px; border-radius: 18px; background: var(--surface-strong); text-align: center; }
.empty-text { margin: 0; font: italic 400 19px/27px var(--font-display); }

.sheet-wrap { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; }
.sheet-veil { position: absolute; inset: 0; background: color-mix(in srgb, #141712 60%, transparent); backdrop-filter: blur(2px); }
.sheet { position: relative; width: 100%; max-height: 92svh; overflow-y: auto; box-sizing: border-box; padding: 10px 20px calc(28px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; background: var(--bg); box-shadow: 0 -8px 24px rgba(20, 23, 18, 0.12); display: flex; flex-direction: column; gap: 18px; }
.sheet-handle { align-self: center; width: 36px; height: 4px; border-radius: 9999px; background: var(--ink-faint); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sheet-title { margin: 0; font: 400 30px/28px var(--font-display); }
.sheet-close { width: 44px; height: 44px; margin-right: -10px; border: 0; border-radius: 12px; background: transparent; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; }

@media (min-width: 1024px) {
  .roasters { padding: 40px 48px 64px; gap: 28px; }
  .back-label { display: inline; }
  .new-btn { height: 48px; padding: 0 18px; font-size: 15px; line-height: 20px; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .layout { flex-direction: row; gap: 32px; align-items: flex-start; }
  .list-col { flex: 1 1 360px; min-width: 0; }
  .list { padding: 0; background: transparent; gap: 4px; }
  .row { min-height: 68px; padding: 0 14px; border-bottom: 0; border-radius: 14px; }
  .row:hover { background: var(--surface); }
  .row--on { background: var(--surface); box-shadow: inset 0 0 0 2px var(--primary); }
  .avatar { width: 40px; height: 40px; font-size: 18px; }
  .panel { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 18px; padding: 28px; border-radius: 18px; background: var(--surface-strong); }
  .panel :deep(.input), .panel :deep(.switch-row) { background: var(--bg); }
  .panel :deep(.actions) { flex-direction: row; justify-content: space-between; }
  .panel-head { display: flex; align-items: center; gap: 16px; }
  .panel-title-wrap { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .panel-title { margin: 0; font: 400 30px/30px var(--font-display); }
  .panel-empty { margin: 0; font: italic 400 19px/27px var(--font-display); color: var(--ink-soft); }
}
</style>
