<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Roaster, RoasterInput } from '~/types'

const router = useRouter()
const roastersStore = useRoastersStore()
const coffeesStore = useCoffeesStore()
const { confirm } = useConfirm()

// `ready` evita mostrar «sin marcas» mientras la lista aún carga.
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

const q = ref('')

const filtered = computed<Roaster[]>(() => {
  const list = (roastersStore.list as Roaster[]) || []
  const s = q.value.trim().toLowerCase()
  if (!s) return list
  return list.filter(r =>
    [r.name, r.city, r.country].some(x => (x || '').toLowerCase().includes(s)),
  )
})

function coffeesCount(roasterId: string): number {
  return (coffeesStore.list as { roasterId?: string }[]).filter(c => c.roasterId === roasterId).length
}

const sheetOpen = ref(false)
const editing = ref<Roaster | null>(null)
const saving = ref(false)

function openSheet(r: Roaster | null) {
  editing.value = r
  sheetOpen.value = true
}

async function save(payload: RoasterInput) {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) await roastersStore.update(editing.value.id, payload as Partial<Roaster>)
    else await roastersStore.create(payload)
    sheetOpen.value = false
  }
  catch {
    // el store avisa con un toast
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value) return
  const ok = await confirm({
    title: 'Eliminar marca',
    message: 'Los cafés asociados conservarán su nombre actual.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await roastersStore.remove(editing.value.id)
    sheetOpen.value = false
  }
  catch {
    // el store avisa con un toast
  }
}
</script>

<template>
  <div class="rl">
    <header class="rl-head">
      <button type="button" class="rl-icon" aria-label="Volver" @click="router.back()">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="rl-title">Marcas</h1>
      <button type="button" class="rl-icon" aria-label="Nueva marca" @click="openSheet(null)">
        <AppIcon name="plus" :size="22" :stroke="2" />
      </button>
    </header>

    <label class="rl-search">
      <input v-model="q" type="search" placeholder="Buscar marca" aria-label="Buscar marca">
    </label>

    <div v-if="filtered.length" class="rl-list">
      <button v-for="r in filtered" :key="r.id" type="button" class="rl-row" @click="openSheet(r)">
        <span class="rl-col">
          <span>{{ r.name }}</span>
          <span v-if="r.city || r.country" class="rl-sub">{{ [r.city, r.country].filter(Boolean).join(' · ') }}</span>
        </span>
        <span class="rl-end">
          {{ coffeesCount(r.id) }} {{ coffeesCount(r.id) === 1 ? 'café' : 'cafés' }} ›
        </span>
      </button>
    </div>
    <p v-else-if="ready || q" class="rl-empty">
      {{ q ? 'Ninguna marca coincide con la búsqueda.' : 'Aún no tienes marcas. Toca + para añadir la primera.' }}
    </p>

    <RoasterSheet
      :open="sheetOpen"
      :roaster="editing"
      :saving="saving"
      @close="sheetOpen = false"
      @save="save"
      @remove="remove"
    />
  </div>
</template>

<style scoped>
.rl { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 12px; color: var(--ink); font-family: var(--font-sans); }
.rl-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.rl-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.rl-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.rl-search { display: flex; height: var(--field-height); padding: 0 14px; border-radius: var(--radius-sm); background: var(--surface); }
.rl-search input { flex: 1; min-width: 0; border: 0; background: transparent; font: 400 16px/22px var(--font-sans); color: var(--ink); outline: none; }
.rl-search:focus-within { box-shadow: 0 0 0 2px var(--primary); }
.rl-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.rl-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 8px 14px; font-size: 15px; color: var(--ink); text-align: left; }
.rl-row + .rl-row { border-top: 1px solid var(--line); }
.rl-col { display: flex; flex-direction: column; min-width: 0; }
.rl-sub { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.rl-end { font-size: 14px; color: var(--ink-soft); flex-shrink: 0; }
.rl-empty { margin: 16px 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
