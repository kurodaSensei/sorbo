<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Tasting } from '~/types'

const { currentUser } = useAuth()
const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()
const { getBrewMethodLabel } = useCatalog()

// `ready` evita que el empty state y el subtitle de "0 sorbos" se vean
// mientras la lista aún está cargando.
const ready = ref(false)

onMounted(async () => {
  tastingsStore.loadShared().catch(() => {})
  coffeesStore.loadAll().catch(() => {})
  try {
    await tastingsStore.loadAll()
  }
  finally {
    ready.value = true
  }
})

async function refresh() {
  await Promise.all([
    tastingsStore.loadAll(),
    tastingsStore.loadShared().catch(() => {}),
  ])
}

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const tab = ref<'mine' | 'shared'>('mine')
const search = ref('')

const mineCount = computed(() => tastingsStore.list.length)
const sharedCount = computed(() => tastingsStore.sharedList.length)

const segments = computed(() => [
  { key: 'mine', label: 'Mías', count: mineCount.value },
  { key: 'shared', label: 'Compartidas', count: sharedCount.value },
])

const items = computed<Tasting[]>(() => {
  const source = tab.value === 'mine'
    ? (tastingsStore.list as Tasting[])
    : (tastingsStore.sharedList as Tasting[])
  const q = search.value.trim().toLowerCase()
  const searched = q
    ? (source || []).filter(t =>
        (t.coffeeName || '').toLowerCase().includes(q)
        || (t.roasterName || '').toLowerCase().includes(q),
      )
    : (source || [])
  return [...searched].sort((a, b) => {
    const ta = tsMillis(a.brewDate) || tsMillis(a.createdAt)
    const tb = tsMillis(b.brewDate) || tsMillis(b.createdAt)
    return tb - ta
  })
})

const isEmpty = computed(() => items.value.length === 0)

function tsMillis(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}

function relativeDate(ts: any): string {
  const ms = tsMillis(ts)
  if (!ms) return ''
  const d = new Date(ms)
  const diffH = (Date.now() - ms) / 1000 / 3600
  if (diffH < 1) return 'hace minutos'
  if (diffH < 24) return `hace ${Math.round(diffH)} ${Math.round(diffH) === 1 ? 'hora' : 'horas'}`
  const diffD = diffH / 24
  if (diffD < 7) return `hace ${Math.round(diffD)} ${Math.round(diffD) === 1 ? 'día' : 'días'}`
  const day = d.getDate()
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '').toUpperCase()
  return `${day} ${month}`
}

function rowEyebrow(t: Tasting): string {
  const method = getBrewMethodLabel(t.brewMethod).toUpperCase()
  return [method, relativeDate(t.brewDate)].filter(Boolean).join(' · ')
}

// Sheet state
const sheetOpen = ref(false)
const activeTasting = ref<Tasting | null>(null)

function openSheet(t: Tasting) {
  activeTasting.value = t
  sheetOpen.value = true
}

const activeCoffee = computed<Coffee | null>(() => {
  if (!activeTasting.value) return null
  return (coffeesStore.list as Coffee[]).find(c => c.id === activeTasting.value!.coffeeId) ?? null
})

// ─── Catas v3 (interruptor «catas») ───────────────────────────────────────
// Misma lógica; la lista se agrupa por día (o por amigo en compartidas) y
// tocar una cata abre el detalle.
const v3 = useFlag('catas')
const tastingTime = (t: Tasting) => tsMillis(t.brewDate) || tsMillis(t.createdAt)

const groups = computed(() => {
  const out: { label: string, rows: Tasting[] }[] = []
  for (const t of items.value) {
    const label = tab.value === 'shared'
      ? (t.authorName ? `De ${t.authorName}` : 'De tus amigos')
      : dayGroup(new Date(tastingTime(t)))
    const last = out.at(-1)
    if (last && last.label === label) last.rows.push(t)
    else out.push({ label, rows: [t] })
  }
  return out
})

const monthName = computed(() => new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date()))
const month = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const list = (tastingsStore.list as Tasting[]).filter(t => tastingTime(t) >= start && ratingToScore(t.ratingOverall) > 0)
  if (!list.length) return null
  const avg = list.reduce((sum, t) => sum + ratingToScore(t.ratingOverall), 0) / list.length
  const best = [...list].sort((a, b) => b.ratingOverall - a.ratingOverall)[0]
  return { count: list.length, avg: avg.toFixed(1), best }
})
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div v-if="v3" class="v3 tastings">
      <header class="head">
        <div class="head-row">
          <span class="v3-eyebrow head-eb">— Catas · {{ mineCount }}</span>
          <div class="head-icons">
            <UiNotificationBell size="sm" />
            <NuxtLink to="/app/settings" class="icon-btn" aria-label="Ajustes de tu cuenta">
              <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
            </NuxtLink>
          </div>
        </div>
        <div class="title-row">
          <div class="title-text">
            <h1 class="title">Tus <span class="v3-accent-word">catas</span></h1>
            <p class="v3-subtitle sub">
              <template v-if="tab === 'shared'">Lo que han catado tus amigos.</template>
              <template v-else-if="ready && mineCount">{{ mineCount }} {{ mineCount === 1 ? 'sorbo registrado' : 'sorbos registrados' }}.</template>
              <template v-else>Tu memoria de taza.</template>
            </p>
          </div>
          <NuxtLink to="/app/tastings/new" class="v3-btn v3-btn--primary new-btn">
            <Icon name="lucide:plus" size="18" /><span class="mobile-only">Nueva</span><span class="desktop-only">Nueva cata</span>
          </NuxtLink>
        </div>
      </header>

      <div class="toolbar">
        <div role="tablist" aria-label="Qué catas ver" class="seg">
          <button
            v-for="sgm in segments"
            :key="sgm.key"
            type="button"
            role="tab"
            :aria-selected="tab === sgm.key"
            :class="['seg-btn', { 'seg-btn--on': tab === sgm.key }]"
            @click="tab = sgm.key as 'mine' | 'shared'"
          >
            {{ sgm.key === 'shared' ? 'Compartidas conmigo' : sgm.label }} · {{ sgm.count }}
          </button>
        </div>
        <div class="search">
          <Icon name="lucide:search" size="18" class="search-icon" />
          <label for="ct-search" class="sr-only">Buscar cata</label>
          <input id="ct-search" v-model="search" type="search" class="v3-input search-input" placeholder="Café o marca" autocomplete="off">
        </div>
      </div>

      <div class="layout">
        <div class="main">
          <div v-if="!ready" class="group" aria-busy="true">
            <div class="list">
              <div v-for="n in 4" :key="`skel-${n}`" class="skel"><UiSkeleton class="h-12 w-12" /><UiSkeleton class="h-4 w-2/3" /></div>
            </div>
          </div>

          <div v-else-if="isEmpty" class="empty">
            <p class="empty-text">
              <template v-if="search.trim()">Ninguna cata coincide con tu búsqueda.</template>
              <template v-else-if="tab === 'shared'">Aún no te han compartido catas. Pídele a un amigo que comparta una.</template>
              <template v-else>Cada sorbo es un pequeño viaje. Empieza el tuyo anotando uno.</template>
            </p>
            <NuxtLink v-if="tab === 'mine' && !search.trim()" to="/app/tastings/new" class="v3-btn v3-btn--primary">Anota tu primera cata</NuxtLink>
          </div>

          <template v-else>
            <section v-for="g in groups" :key="g.label" class="group" :aria-label="g.label">
              <h2 class="group-label">{{ g.label }}</h2>
              <div class="list">
                <V3TastingRow
                  v-for="t in g.rows"
                  :key="t.id"
                  class="list-row"
                  :to="`/app/tastings/${t.id}`"
                  :rating="t.ratingOverall"
                  :name="t.coffeeName.replace(/\.$/, '')"
                  :roaster="t.roasterName"
                  :method="t.brewMethod && t.brewMethod !== 'other' ? getBrewMethodLabel(t.brewMethod) : ''"
                  :note="t.personalNotes"
                  :favorite="t.isFavorite"
                />
              </div>
            </section>
          </template>
        </div>

        <aside v-if="tab === 'mine' && month" class="rail desktop-only" aria-labelledby="ct-month">
          <h2 id="ct-month" class="v3-eyebrow rail-eb">— Este mes · {{ monthName }}</h2>
          <dl class="stats">
            <div class="stat"><dt>Catas</dt><dd>{{ month.count }}</dd></div>
            <div class="stat"><dt>Promedio</dt><dd>{{ month.avg }}</dd></div>
          </dl>
          <NuxtLink :to="`/app/tastings/${month.best.id}`" class="best">
            <span :class="['best-badge', `tone-${scoreTone(month.best.ratingOverall)}`]">{{ ratingToScore(month.best.ratingOverall) }}</span>
            <span class="best-text"><span class="v3-meta">Tu mejor taza del mes</span><span class="best-name">{{ month.best.coffeeName }}</span></span>
          </NuxtLink>
        </aside>
      </div>
    </div>

    <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>Catas · {{ mineCount }}</UiEyebrow>
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
          Tus <span class="italic text-olive">catas</span>
        </h1>
        <p class="subtitle-italic mt-xs">
          <template v-if="tab === 'shared'">Lo que han catado tus amigos.</template>
          <template v-else-if="ready && items.length > 0">
            {{ items.length }} sorbo{{ items.length === 1 ? '' : 's' }} registrado{{ items.length === 1 ? '' : 's' }}.
          </template>
          <template v-else>Tu memoria de taza.</template>
        </p>
      </div>
      <div class="flex items-center gap-md">
        <UiSegmented v-model="tab" :items="segments" />
        <UiButton
          variant="primary"
          :block="false"
          to="/app/tastings/new"
          size="sm"
          class="hidden lg:inline-flex"
        >
          + Nueva cata
        </UiButton>
      </div>
    </div>

    <UiListSearch v-model="search" placeholder="Buscar por café o marca…" class="mt-md" />

    <!-- Skeletons mientras carga -->
    <div
      v-if="!ready"
      class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
      aria-busy="true"
    >
      <div
        v-for="n in 4"
        :key="`skel-${n}`"
        class="rounded-card-lg bg-surface p-md flex flex-col gap-xs"
      >
        <div class="flex items-start justify-between gap-md">
          <div class="flex-1 flex flex-col gap-xs">
            <UiSkeleton class="h-3 w-28" />
            <UiSkeleton class="h-7 w-2/3 rounded-card mt-xxs" />
          </div>
          <div class="flex items-baseline gap-xxs">
            <UiSkeleton class="h-7 w-10" />
            <UiSkeleton class="h-4 w-6" />
          </div>
        </div>
        <UiSkeleton class="h-3 w-full mt-xs" />
      </div>
    </div>

    <!-- Empty — solo después de la primera carga. -->
    <div v-if="isEmpty && ready" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[340px] rounded-card-lg bg-surface px-lg py-2xl text-center">
        <p class="font-display italic text-[16px] text-moss leading-relaxed">
          <template v-if="tab === 'shared'">
            Aún no te han compartido catas. Pide a un amigo que comparta una.
          </template>
          <template v-else>
            "Cada sorbo es un pequeño viaje. Empieza el tuyo registrando uno."
          </template>
        </p>
      </div>
      <UiButton
        v-if="tab === 'mine'"
        variant="dark"
        :block="false"
        to="/app/tastings/new"
        class="lg:hidden"
      >
        + Registra tu primera cata
      </UiButton>
    </div>

    <!-- List -->
    <ul v-else class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md">
      <li v-for="t in items" :key="t.id">
        <button
          type="button"
          class="w-full text-left rounded-card-lg bg-surface p-md transition-colors duration-150 ease-sorbo hover:bg-surface-2"
          @click="openSheet(t)"
        >
          <div class="flex items-start justify-between gap-md">
            <div class="min-w-0 flex flex-col gap-xs">
              <UiEyebrow>{{ rowEyebrow(t) }}</UiEyebrow>
              <div class="font-display text-[28px] leading-none tracking-[-0.01em] truncate">
                {{ t.coffeeName.endsWith('.') ? t.coffeeName.slice(0, -1) : t.coffeeName }}
              </div>
              <p v-if="t.personalNotes" class="font-display italic text-[13px] text-moss-soft line-clamp-1">
                "{{ t.personalNotes }}"
              </p>
            </div>
            <div class="shrink-0 flex items-baseline gap-[2px] pl-sm">
              <span class="font-display text-[28px] leading-none text-olive">
                {{ t.ratingOverall.toFixed(1) }}
              </span>
              <span class="font-display text-[14px] leading-none text-moss-ghost">
                /10
              </span>
            </div>
          </div>
        </button>
      </li>
    </ul>

    <!-- Mobile FAB -->
    <NuxtLink
      v-if="!isEmpty"
      to="/app/tastings/new"
      class="lg:hidden fixed bottom-[96px] right-md z-20 inline-flex size-[56px] items-center justify-center rounded-pill bg-olive text-paper shadow-[0_8px_24px_rgba(47,53,40,0.18)] transition-transform duration-150 ease-sorbo hover:-translate-y-[2px]"
      aria-label="Nueva cata"
    >
      <Icon name="lucide:plus" class="size-6" />
    </NuxtLink>

    <!-- Detail sheet -->
    <UiBottomSheet v-model="sheetOpen">
      <TastingDetail
        v-if="activeTasting"
        :tasting="activeTasting"
        :coffee="activeCoffee"
      />
      <div v-if="activeTasting" class="mt-lg flex flex-col gap-xs">
        <UiButton
          variant="primary"
          :block="true"
          :to="`/app/tastings/${activeTasting.id}`"
          @click="sheetOpen = false"
        >
          Ver completa
        </UiButton>
      </div>
    </UiBottomSheet>
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.tastings { box-sizing: border-box; max-width: 1180px; padding: 12px 20px 120px; display: flex; flex-direction: column; gap: 20px; background: transparent; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.desktop-only { display: none !important; }
.head { display: flex; flex-direction: column; gap: 14px; }
.head-row { display: flex; align-items: center; justify-content: space-between; }
.head-eb { color: var(--ink-soft); }
.head-icons { display: flex; align-items: center; }
.icon-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.title-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.new-btn { flex: none; height: 40px; padding: 0 14px; font-size: 13px; gap: 6px; }
.toolbar { display: flex; flex-direction: column; gap: 12px; }
.seg { display: flex; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg-btn { flex: 1; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 13px/16px var(--font-sans); cursor: pointer; }
.seg-btn--on { background: var(--bg); font-weight: 600; }
.search { position: relative; flex: 1; min-width: 0; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.layout { display: flex; flex-direction: column; gap: 24px; }
.main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-label { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.list-row { border-bottom: 1px solid var(--line); }
.list-row:last-child { border-bottom: 0; }
.skel { display: flex; align-items: center; gap: 14px; min-height: 76px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; text-align: center; }
.empty-text { margin: 0; max-width: 320px; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }
.rail { flex-direction: column; gap: 14px; padding: 24px; border-radius: 24px; background: var(--surface-strong); }
.rail-eb { margin: 0; color: var(--ink-soft); }
.stats { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat { display: flex; flex-direction: column; gap: 2px; padding: 14px; border-radius: 16px; background: var(--bg); }
.stat dt { font: 400 13px/18px var(--font-sans); color: var(--ink-soft); }
.stat dd { margin: 0; font: 400 36px/1 var(--font-display); }
.best { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: var(--bg); color: var(--ink); text-decoration: none; }
.best-badge { flex: none; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 400 20px/1 var(--font-display); background: var(--surface-strong); }
.best-badge.tone-high { background: var(--accent); color: var(--on-accent); }
.best-badge.tone-good { background: var(--tint); color: var(--on-tint); }
.best-text { display: flex; flex-direction: column; min-width: 0; }
.best-name { font: 400 19px/22px var(--font-display); }

@media (min-width: 1024px) {
  .tastings { padding: 40px 48px 64px; gap: 24px; }
  .mobile-only, .head-row { display: none !important; }
  .desktop-only { display: flex !important; }
  .new-btn .desktop-only { display: inline !important; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .new-btn { height: 48px; padding: 0 18px; font-size: 15px; gap: 8px; }
  .toolbar { flex-direction: row; align-items: center; }
  .seg { flex: none; }
  .seg-btn { flex: none; padding: 0 16px; font-size: 14px; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .main { flex: 3 1 480px; }
  .rail { flex: 2 1 280px; min-width: 0; position: sticky; top: 24px; }
}
</style>
