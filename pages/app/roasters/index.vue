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
</script>

<template>
  <div class="mx-auto w-full max-w-[640px] px-md pt-md pb-2xl lg:px-xl lg:pt-xl">
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
