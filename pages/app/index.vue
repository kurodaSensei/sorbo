<script setup lang="ts">
import { scoreTone as scoreTone1to5 } from '~/utils/score'
import { computed, onMounted, ref, watch } from 'vue'
import type { Coffee, Tasting } from '~/types'

const { currentUser } = useAuth()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const settingsStore = useSettingsStore()

// `tastingsReady` evita el flash del empty state "Aún no has registrado..."
// mientras las catas todavía están cargando.
const tastingsReady = ref(false)

onMounted(async () => {
  coffeesStore.loadAll().catch(() => {})
  if (!settingsStore.prefs) settingsStore.load().catch(() => {})
  try {
    await tastingsStore.loadAll()
  }
  finally {
    tastingsReady.value = true
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────────────────────────────────────

const welcomeOpen = ref(false)

// Show the welcome sheet only once, the first time prefs loads with hasSeenWelcome=false.
// Watch instead of computed because we want a one-shot trigger that survives prefs mutations later.
watch(
  () => settingsStore.prefs,
  (prefs) => {
    if (prefs && prefs.hasSeenWelcome === false) {
      welcomeOpen.value = true
    }
  },
  { immediate: true },
)

async function onWelcomeFinish() {
  await settingsStore.markWelcomeSeen().catch(() => {})
}

const showOnboardingChecklist = computed(() => {
  const prefs = settingsStore.prefs
  return !!prefs && prefs.hasSeenWelcome === true && prefs.hideOnboardingChecklist !== true
})

const { confirm } = useConfirm()

async function dismissChecklist() {
  const ok = await confirm({
    title: '¿Ocultar la guía?',
    message: 'La checklist te ayuda con los primeros pasos. Puedes traerla de vuelta desde Ajustes.',
    confirmLabel: 'Ocultar',
    cancelLabel: 'Mantener',
  })
  if (!ok) return
  await settingsStore.dismissOnboardingChecklist().catch(() => {})
}

// Guía próximos pasos cuando el usuario aún no tiene datos suficientes.
// Prioridad: (1) sin cafés → agregar café · (2) tiene cafés pero no catas
// → catar el primero · (3) tiene catas → mostrar última.
const coffeesCount = computed(() => (coffeesStore.list as Coffee[]).length)

const userName = computed(() => {
  const u = currentUser.value
  return u?.displayName || u?.email?.split('@')[0] || ''
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const today = computed(() => {
  const d = new Date()
  const dayName = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d).toUpperCase()
  const day = d.getDate()
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '').toUpperCase()
  const year = d.getFullYear()
  return { dayName, day, month, year }
})

const processLabel: Record<string, string> = {
  washed: 'lavado',
  natural: 'natural',
  honey: 'honey',
  anaerobic: 'anaeróbico',
  carbonic: 'carbónico',
  experimental: 'experimental',
  other: '',
}

function tsMillis(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (ts instanceof Date) return ts.getTime()
  return 0
}

const lastTasting = computed<Tasting | null>(() => {
  const list = (tastingsStore.list as Tasting[]) ?? []
  if (list.length === 0) return null
  return [...list].sort((a, b) => {
    const ta = tsMillis(a.brewDate) || tsMillis(a.createdAt)
    const tb = tsMillis(b.brewDate) || tsMillis(b.createdAt)
    return tb - ta
  })[0]
})

const lastCoffee = computed<Coffee | null>(() => {
  const t = lastTasting.value
  if (!t) return null
  return (coffeesStore.list as Coffee[]).find(c => c.id === t.coffeeId) ?? null
})

const lastTastingLine = computed(() => {
  const t = lastTasting.value
  if (!t) return null
  const proc = lastCoffee.value?.process ? processLabel[lastCoffee.value.process] || '' : ''
  return {
    coffeeName: t.coffeeName,
    process: processAfterName(t.coffeeName, proc),
    roasterName: t.roasterName,
    score: typeof t.ratingOverall === 'number' ? (catas1to5.value ? ratingToScore(t.ratingOverall) : t.ratingOverall) : null,
  }
})

const monthStartMs = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
})

const catas1to5 = useFlag('catas')

const stats = computed(() => {
  const start = monthStartMs.value
  const monthCoffees = (coffeesStore.list as Coffee[]).filter(c => tsMillis(c.createdAt) >= start)
  const monthTastings = (tastingsStore.list as Tasting[]).filter(t =>
    (tsMillis(t.brewDate) || tsMillis(t.createdAt)) >= start,
  )
  // Con el interruptor «catas» el puntaje se muestra de 1 a 5.
  const scores = monthTastings.map(t => t.ratingOverall).filter((s): s is number => typeof s === 'number')
    .map(s => (catas1to5.value ? ratingToScore(s) : s)).filter(s => s > 0)
  const avg = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null
  return {
    coffees: monthCoffees.length,
    tastings: monthTastings.length,
    avgScore: avg,
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Inicio v3 (interruptor «inicio»). Reutiliza los datos de arriba; la vista
// v1 se borra en la limpieza final.
// ─────────────────────────────────────────────────────────────────────────
const v3 = useFlag('inicio')

const homeState = computed(() => {
  if (!tastingsReady.value) return 'loading'
  if (lastTasting.value) return 'data'
  return coffeesCount.value === 0 ? 'noCoffees' : 'noTastings'
})

const todayLong = computed(() => {
  const s = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1).replace(',', '')
})

const tastingTime = (t: Tasting) => tsMillis(t.brewDate) || tsMillis(t.createdAt)
const scoreText = (n: unknown) => {
  if (typeof n !== 'number') return null
  if (catas1to5.value) return ratingToScore(n) ? String(ratingToScore(n)) : null
  return String(Math.round(n * 10) / 10)
}

const lastCard = computed(() => {
  const t = lastTasting.value
  if (!t) return null
  return {
    id: t.id,
    coffeeId: t.coffeeId,
    name: t.coffeeName,
    roaster: t.roasterName,
    when: [formatRelativeDay(new Date(tastingTime(t))), t.brewMethod ? getBrewMethodLabel(t.brewMethod) : '']
      .filter(Boolean).join(' · '),
    score: scoreText(t.ratingOverall),
    note: t.personalNotes?.trim() || '',
  }
})

// Primer nombre para el saludo: «Alfredo Romero» parte el título en dos líneas.
const firstName = computed(() => userName.value.split(' ')[0])

// Color del puntaje: miel desde 9, salvia desde 7.5.
const scoreTone = (n: unknown) => {
  if (typeof n !== 'number') return 'none'
  if (catas1to5.value) return scoreTone1to5(n)
  return n >= 9 ? 'high' : n >= 7.5 ? 'good' : 'none'
}
const recentTastings = computed(() =>
  [...(tastingsStore.list as Tasting[])]
    .sort((a, b) => tastingTime(b) - tastingTime(a))
    .slice(1, 4)
    .map(t => ({
      id: t.id,
      name: t.coffeeName,
      roaster: t.roasterName,
      day: formatRelativeDay(new Date(tastingTime(t))),
      method: t.brewMethod ? getBrewMethodLabel(t.brewMethod) : '',
      score: scoreText(t.ratingOverall),
      tone: scoreTone(t.ratingOverall),
    })),
)

// En móvil la fecha vive en la franja del mes: «Domingo 18» sobre «Octubre».
const dayShort = computed(() => {
  const d = new Date()
  const w = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d)
  return `${w.charAt(0).toUpperCase() + w.slice(1)} ${d.getDate()}`
})

const monthName = computed(() => {
  const m = new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date())
  return m.charAt(0).toUpperCase() + m.slice(1)
})
</script>

<template>
  <div v-if="v3" class="v3 home">
    <div class="home-main">
      <!-- Cabecera -->
      <header class="home-header">
        <div class="home-hello">
          <span class="home-date">{{ todayLong }}</span>
          <h1 class="home-title">{{ greeting }}, <span class="v3-accent-word">{{ firstName || 'cafetero' }}</span></h1>
        </div>
        <div class="home-tools">
          <UiNotificationBell size="sm" />
          <NuxtLink to="/app/settings" class="home-avatar" aria-label="Ajustes de tu cuenta">
            <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
          </NuxtLink>
        </div>
      </header>

      <!-- Móvil: el mes como franja bajo el saludo -->
      <div v-if="homeState !== 'loading'" class="month-strip mobile-only" aria-label="Este mes">
        <span class="month-strip-label"><span class="month-strip-day">{{ dayShort }}</span><span class="v3-eyebrow">{{ monthName }}</span></span>
        <span class="month-strip-cell"><span class="month-strip-num">{{ stats.tastings }}</span><span class="v3-meta">{{ stats.tastings === 1 ? 'cata' : 'catas' }}</span></span>
        <span class="month-strip-cell"><span class="month-strip-num">{{ stats.coffees }}</span><span class="v3-meta">{{ stats.coffees === 1 ? 'café nuevo' : 'cafés nuevos' }}</span></span>
        <span class="month-strip-cell"><span class="month-strip-num" :class="{ muted: stats.avgScore === null }">{{ stats.avgScore ?? '—' }}</span><span class="v3-meta">promedio</span></span>
      </div>

      <!-- Cargando -->
      <div v-if="homeState === 'loading'" class="home-skeleton" role="status" aria-label="Cargando tu diario">
        <span class="sk sk-strip mobile-only" />
        <span class="sk-card">
          <span class="sk sk-line sk-w40" />
          <span class="sk sk-title" />
          <span class="sk sk-line sk-w60" />
          <span class="sk sk-line sk-w90" />
          <span class="sk-actions"><span class="sk sk-btn" /><span class="sk sk-btn" /></span>
        </span>
        <span class="sk-list"><span v-for="n in 2" :key="n" class="sk-row"><span class="sk sk-badge" /><span class="sk-row-text"><span class="sk sk-line sk-w60" /><span class="sk sk-line sk-w40" /></span></span></span>
      </div>

      <!-- Con datos: la última taza como portada -->
      <template v-else-if="homeState === 'data' && lastCard">
        <section class="last" aria-label="Tu última taza">
          <span aria-hidden="true" class="last-blob" />
          <NuxtLink :to="`/app/tastings/${lastCard.id}`" class="last-body">
            <span class="v3-eyebrow last-eyebrow">— Tu última taza · {{ lastCard.when }}</span>
            <span class="last-row">
              <span class="last-names">
                <span class="last-name">{{ lastCard.name }}</span>
                <span class="last-roaster">de {{ lastCard.roaster }}</span>
              </span>
              <span v-if="lastCard.score" class="last-score">{{ lastCard.score }}</span>
            </span>
            <p v-if="lastCard.note" class="last-note">«{{ lastCard.note }}»</p>
          </NuxtLink>
          <div class="last-actions">
            <NuxtLink :to="`/app/tastings/new?coffeeId=${lastCard.coffeeId}`" class="v3-btn v3-btn--primary">
              <Icon name="lucide:rotate-ccw" size="18" /> Repetir
            </NuxtLink>
            <NuxtLink to="/app/tastings/new" class="v3-btn last-new">
              <Icon name="lucide:plus" size="18" /> Nueva cata
            </NuxtLink>
          </div>
        </section>

        <section v-if="recentTastings.length" aria-label="Tus últimas catas" class="recent">
          <div class="section-head">
            <h2 class="v3-label m-0">Tus últimas catas</h2>
            <NuxtLink to="/app/tastings" class="v3-link section-link">Ver todas</NuxtLink>
          </div>
          <div class="recent-list">
            <NuxtLink v-for="r in recentTastings" :key="r.id" :to="`/app/tastings/${r.id}`" class="recent-row">
              <span class="recent-score" :class="`tone-${r.tone}`">{{ r.score ?? '—' }}</span>
              <span class="recent-text">
                <span class="recent-name">{{ r.name }}</span>
                <span class="v3-meta">{{ [r.roaster, r.method, r.day].filter(Boolean).join(' · ') }}</span>
              </span>
              <Icon name="lucide:chevron-right" size="18" class="recent-chevron" />
            </NuxtLink>
          </div>
        </section>

        <V3Checklist v-if="showOnboardingChecklist" class="home-card" @dismiss="dismissChecklist" />
      </template>

      <!-- Sin datos: primeros pasos como portada -->
      <section v-else aria-label="Empieza aquí" class="home-card empty">
        <span class="v3-eyebrow empty-eyebrow">— Empieza aquí</span>
        <p class="empty-text">
          <template v-if="homeState === 'noCoffees'">Todavía no tienes cafés guardados. Empieza por el que tienes en casa.</template>
          <template v-else>Aún no has puntuado ningún café. Prueba uno y anota qué te pareció.</template>
        </p>
        <NuxtLink
          :to="homeState === 'noCoffees' ? '/app/coffees/new' : '/app/tastings/new'"
          class="v3-btn v3-btn--primary"
        >
          {{ homeState === 'noCoffees' ? 'Agregar mi primer café' : 'Puntuar mi primer café' }}
        </NuxtLink>
        <V3Checklist v-if="showOnboardingChecklist" @dismiss="dismissChecklist" />
      </section>

      <!-- Móvil: preparar y el mes -->
      <NuxtLink to="/app/vertido" class="prepare mobile-only">
        <span aria-hidden="true" class="prepare-icon"><Icon name="lucide:timer-reset" size="22" /></span>
        <span class="prepare-text">
          <span class="prepare-title">¿Preparas café?</span>
          <span class="prepare-sub">Café, método, receta y taza, paso a paso.</span>
        </span>
      </NuxtLink>
    </div>

    <!-- Escritorio: columna derecha -->
    <aside class="home-rail" aria-label="Atajos">
      <NuxtLink to="/app/vertido" class="prepare prepare--big">
        <span class="prepare-text">
          <span class="v3-eyebrow prepare-eyebrow">— Hoy</span>
          <span class="prepare-title">¿Preparas café?</span>
          <span class="prepare-sub">Café, método, receta y taza, paso a paso.</span>
        </span>
        <span aria-hidden="true" class="prepare-go"><Icon name="lucide:arrow-right" size="20" /></span>
      </NuxtLink>

      <nav class="shortcuts" aria-label="Acciones rápidas">
        <NuxtLink v-if="lastCard" :to="`/app/tastings/new?coffeeId=${lastCard.coffeeId}`" class="shortcut">
          <Icon name="lucide:rotate-ccw" size="22" class="shortcut-icon" />
          <span class="shortcut-text"><span class="shortcut-title">Repetir última cata</span><span class="v3-meta">Volver a probar {{ lastCard.name }}</span></span>
          <Icon name="lucide:chevron-right" size="18" class="shortcut-chevron" />
        </NuxtLink>
        <NuxtLink to="/app/tastings/new" class="shortcut">
          <Icon name="lucide:pencil-line" size="22" class="shortcut-icon" />
          <span class="shortcut-text"><span class="shortcut-title">Nueva cata</span><span class="v3-meta">Puntúa un café que ya tienes</span></span>
          <Icon name="lucide:chevron-right" size="18" class="shortcut-chevron" />
        </NuxtLink>
        <NuxtLink to="/app/coffees/new" class="shortcut">
          <Icon name="lucide:coffee" size="22" class="shortcut-icon" />
          <span class="shortcut-text"><span class="shortcut-title">Nuevo café</span><span class="v3-meta">Guarda origen, tueste y precio</span></span>
          <Icon name="lucide:chevron-right" size="18" class="shortcut-chevron" />
        </NuxtLink>
      </nav>

      <section aria-label="Este mes" class="month-tiles">
        <h2 class="v3-label m-0">Este mes</h2>
        <div class="tiles">
          <div class="tile"><span class="tile-num">{{ stats.coffees }}</span><span class="v3-meta">{{ stats.coffees === 1 ? 'café nuevo' : 'cafés nuevos' }}</span></div>
          <div class="tile"><span class="tile-num">{{ stats.tastings }}</span><span class="v3-meta">{{ stats.tastings === 1 ? 'cata' : 'catas' }}</span></div>
          <div class="tile"><span class="tile-num tile-num--avg">{{ stats.avgScore ?? '—' }}</span><span class="v3-meta">puntaje promedio</span></div>
        </div>
      </section>
    </aside>

    <V3InstallToast />
    <UiOnboardingWelcome v-model="welcomeOpen" :user-name="userName" @finish="onWelcomeFinish" />
  </div>

  <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-xl lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
    <!-- Header row: date + (mobile avatar | desktop search) -->
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>
        {{ today.dayName }} · {{ today.day }} {{ today.month }}<span class="hidden lg:inline"> · {{ today.year }}</span>
      </UiEyebrow>

      <div class="lg:hidden inline-flex items-center gap-sm">
        <UiNotificationBell size="sm" />
        <NuxtLink to="/app/settings" class="inline-flex">
          <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
        </NuxtLink>
      </div>
    </header>

    <!-- Greeting -->
    <h1
      class="mt-lg font-display tracking-[-0.02em] leading-[1.05] text-moss
             text-[40px] sm:text-[48px] lg:text-[80px] xl:text-[96px]"
    >
      {{ greeting }},<br>
      <span class="italic text-olive">{{ userName || 'cafetero' }}</span>
    </h1>

    <p
      v-if="lastTastingLine"
      class="mt-md font-display italic text-[14px] lg:text-[18px] text-moss-soft max-w-prose"
    >
      Tu última taza fue un {{ lastTastingLine.coffeeName
      }}<template v-if="lastTastingLine.process"> {{ lastTastingLine.process }}</template>
      de {{ lastTastingLine.roasterName
      }}<template v-if="lastTastingLine.score !== null">, con {{ lastTastingLine.score }} puntos</template>.
    </p>
    <!-- Empty states escalonados: guiar al siguiente paso concreto en vez
         de preguntar "¿empezamos hoy?" sin dirección. -->
    <div
      v-else-if="tastingsReady && coffeesCount === 0"
      class="mt-md flex flex-col gap-xs max-w-prose"
    >
      <p class="font-display italic text-[14px] lg:text-[18px] text-moss-soft">
        Todavía no tienes cafés guardados. Empieza por agregar el que tienes en casa.
      </p>
      <NuxtLink
        to="/app/coffees/new"
        class="inline-flex items-center gap-xxs font-mono text-[11px] uppercase tracking-eyebrow text-olive hover:text-olive-dark transition-colors"
      >
        + Agregar mi primer café
      </NuxtLink>
    </div>
    <div
      v-else-if="tastingsReady"
      class="mt-md flex flex-col gap-xs max-w-prose"
    >
      <p class="font-display italic text-[14px] lg:text-[18px] text-moss-soft">
        Aún no has puntuado ningún café. Prueba uno y anota qué te pareció.
      </p>
      <NuxtLink
        to="/app/tastings/new"
        class="inline-flex items-center gap-xxs font-mono text-[11px] uppercase tracking-eyebrow text-olive hover:text-olive-dark transition-colors"
      >
        Puntuar mi primer café
      </NuxtLink>
    </div>

    <!-- PWA install banner (Android/desktop nativo + iOS con instrucciones) -->
    <UiPwaInstallBanner class="mt-xl" />

    <!-- Onboarding checklist (first-run guide) -->
    <UiOnboardingChecklist
      v-if="showOnboardingChecklist"
      class="mt-xl"
      @dismiss="dismissChecklist"
    />

    <!-- Hero + quick actions
         · HeroCard explica qué es una cata en la subtitle (visible mobile)
         · QuickCards con hint editorial que define el vocabulario
         · Cuando hay última cata, mostramos "Repetir" como acelerador para
           usuarios recurrentes (una de las quejas del audit UX). -->
    <section class="mt-xl grid grid-cols-2 lg:grid-cols-3 gap-sm lg:gap-md">
      <UiHeroCard
        eyebrow="Hoy"
        title="¿Preparas café?"
        subtitle="Café, método, receta, taza — el flow completo en ~3 minutos."
        to="/app/vertido"
        class="col-span-2 lg:row-span-2"
      />
      <UiQuickCard
        v-if="lastTasting"
        eyebrow="Acelerador"
        label="Repetir última cata"
        :hint="`Volver a probar ${lastTasting.coffeeName}`"
        :to="`/app/tastings/new?coffeeId=${lastTasting.coffeeId}`"
      />
      <UiQuickCard
        eyebrow="Rápido"
        label="Nueva cata"
        hint="Puntúa un café que ya tienes"
        to="/app/tastings/new"
      />
      <UiQuickCard
        v-if="!lastTasting"
        eyebrow="Rápido"
        label="Nuevo café"
        hint="Guarda origen, tueste y precio"
        to="/app/coffees/new"
      />
    </section>

    <!-- Stats -->
    <section class="mt-2xl">
      <div class="border-t border-moss/10 pt-lg">
        <UiEyebrow>Este mes</UiEyebrow>
      </div>

      <!-- Mobile: row list -->
      <div class="lg:hidden mt-md flex flex-col">
        <div class="flex items-center justify-between border-b border-moss/10 py-md">
          <span class="font-display italic text-[16px] text-moss-soft">
            {{ stats.coffees === 1 ? 'café nuevo' : 'cafés nuevos' }}
          </span>
          <span class="font-mono text-[15px] text-moss">{{ stats.coffees }}</span>
        </div>
        <div class="flex items-center justify-between border-b border-moss/10 py-md">
          <span class="font-display italic text-[16px] text-moss-soft">
            {{ stats.tastings === 1 ? 'cata registrada' : 'catas registradas' }}
          </span>
          <span class="font-mono text-[15px] text-moss">{{ stats.tastings }}</span>
        </div>
        <div class="flex items-center justify-between border-b border-moss/10 py-md">
          <span class="font-display italic text-[16px] text-moss-soft">score promedio</span>
          <span v-if="stats.avgScore !== null" class="font-mono text-[15px] text-olive">{{ stats.avgScore }}</span>
          <span v-else class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost">sin catas</span>
        </div>
      </div>

      <!-- Desktop: 3-col big numbers -->
      <div class="hidden lg:grid mt-lg grid-cols-3 gap-lg">
        <div class="flex flex-col gap-sm">
          <span class="font-display text-[64px] leading-none text-moss">{{ stats.coffees }}</span>
          <span class="font-display italic text-[14px] text-moss-soft">{{ stats.coffees === 1 ? 'café nuevo' : 'cafés nuevos' }}</span>
        </div>
        <div class="flex flex-col gap-sm">
          <span class="font-display text-[64px] leading-none text-moss">{{ stats.tastings }}</span>
          <span class="font-display italic text-[14px] text-moss-soft">{{ stats.tastings === 1 ? 'cata registrada' : 'catas registradas' }}</span>
        </div>
        <div class="flex flex-col gap-sm">
          <span v-if="stats.avgScore !== null" class="font-display text-[64px] leading-none text-olive">{{ stats.avgScore }}</span>
          <span v-else class="font-display italic text-[28px] leading-none text-moss-ghost">sin catas</span>
          <span class="font-display italic text-[14px] text-moss-soft">score promedio</span>
        </div>
      </div>
    </section>

    <!-- ━━━━━━━━━━ WELCOME (first run) ━━━━━━━━━━ -->
    <UiOnboardingWelcome
      v-model="welcomeOpen"
      :user-name="userName"
      @finish="onWelcomeFinish"
    />
  </div>
</template>

<style scoped>
/* Inicio v3 · móvil B «Diario primero» y escritorio Editorial B */
.home { display: flex; flex-wrap: wrap; min-height: 100%; }
.home-main {
  flex: 999 1 560px;
  min-width: 0;
  box-sizing: border-box;
  padding: 20px 20px 160px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.home-rail { display: none; }

.home-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.home-hello { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.home-date { font: 400 13px/18px var(--font-sans); color: var(--ink-soft); }
.home-title { margin: 0; font: 400 30px/32px var(--font-display); letter-spacing: -0.01em; }
.home-tools { display: flex; align-items: center; gap: 4px; flex: none; }
.home-avatar { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; }

/* Cargando: la misma forma que la franja, la tarjeta y la lista, con un brillo suave. */
.home-skeleton { display: flex; flex-direction: column; gap: 16px; }
.sk { display: block; border-radius: 8px; background: linear-gradient(90deg, var(--surface) 0%, var(--surface-strong) 50%, var(--surface) 100%) 0 0 / 200% 100%; animation: sk-shine 1.4s ease-in-out infinite; }
.sk-strip { height: 56px; border-radius: 14px; }
.sk-card { display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 24px; background: var(--surface); }
.sk-card .sk { background-image: linear-gradient(90deg, var(--surface-strong) 0%, var(--bg) 50%, var(--surface-strong) 100%); }
.sk-line { height: 12px; }
.sk-title { height: 34px; width: 70%; border-radius: 10px; }
.sk-w40 { width: 40%; } .sk-w60 { width: 60%; } .sk-w90 { width: 90%; }
.sk-actions { display: flex; gap: 10px; margin-top: 6px; }
.sk-btn { flex: 1; height: 48px; border-radius: 14px; }
.sk-list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.sk-list .sk { background-image: linear-gradient(90deg, var(--surface-strong) 0%, var(--bg) 50%, var(--surface-strong) 100%); }
.sk-row { display: flex; align-items: center; gap: 14px; min-height: 76px; }
.sk-row + .sk-row { border-top: 1px solid var(--line); }
.sk-badge { flex: none; width: 48px; height: 48px; border-radius: 12px; }
.sk-row-text { flex: 1; display: flex; flex-direction: column; gap: 8px; }
@keyframes sk-shine { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }

.month-strip { display: flex; align-items: stretch; margin-top: -16px; border-radius: 14px; background: var(--surface); overflow: hidden; }
.month-strip-label { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 8px 14px; color: var(--ink-soft); }
.month-strip-day { font: 600 13px/16px var(--font-sans); color: var(--ink); white-space: nowrap; }
@media (max-width: 1023px) { .home-date { display: none; } }
.month-strip-cell { flex: 1; display: flex; flex-direction: column; padding: 8px 12px; border-left: 1px solid var(--line); min-width: 0; }
.month-strip-num { font: 400 22px/24px var(--font-display); }
.month-strip-num.muted { color: var(--ink-soft); }
.home-card { padding: 20px; border-radius: 18px; background: var(--surface-strong); }

.last { position: relative; overflow: hidden; border-radius: 18px; background: var(--surface-strong); }
.last-blob { position: absolute; top: -70px; right: -60px; width: 200px; height: 200px; border-radius: 9999px; background: var(--tint); opacity: 0.45; }
.last-body { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 22px 22px 18px; color: var(--ink); text-decoration: none; }
.last-eyebrow { color: var(--ink-soft); }
.last-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 6px; }
.last-names { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.last-name { font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.last-roaster { font: italic 400 15px/22px var(--font-display); color: var(--ink-soft); }
.last-score { flex: none; font: 400 38px/1 var(--font-display); }
.last-note {
  margin: 12px 0 0;
  font: italic 400 17px/25px var(--font-display);
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.last-actions { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 14px 14px; }
.last-new { background: var(--bg); color: var(--ink); }
.last-new:hover { background: var(--surface); }

.section-head { display: flex; align-items: baseline; justify-content: space-between; }
.section-link { font-size: 13px; line-height: 16px; padding: 14px 0; margin: -14px 0; }
.recent { display: flex; flex-direction: column; gap: 14px; }
.recent-list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.recent-row { display: flex; align-items: center; gap: 14px; min-height: 72px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
.recent-row:last-child { border-bottom: 0; }
.recent-score { flex: none; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 400 20px/1 var(--font-display); background: var(--surface-strong); }
.recent-score.tone-high { background: var(--accent); color: var(--on-accent); }
.recent-score.tone-good { background: var(--tint); color: var(--on-tint); }
.recent-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.recent-name { font: 400 19px/22px var(--font-display); }
.recent-chevron { flex: none; color: var(--ink-soft); }

.empty { display: flex; flex-direction: column; gap: 16px; }
.empty-eyebrow { color: var(--ink-soft); }
.empty-text { margin: 0; font: italic 400 22px/29px var(--font-display); }

.prepare {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: var(--brand-surface);
  color: var(--on-brand-surface);
  text-decoration: none;
}
.prepare-icon { flex: none; width: 44px; height: 44px; border-radius: 12px; background: var(--accent); color: var(--on-accent); display: flex; align-items: center; justify-content: center; }
.prepare-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.prepare-title { font: 400 22px/24px var(--font-display); }
.prepare-sub { font: 400 13px/18px var(--font-sans); opacity: 0.75; }

@media (min-width: 1024px) {
  .mobile-only, .home-avatar { display: none; }
  .home-main { padding: 32px 40px 48px; gap: 32px; }
  .home-hello { gap: 12px; }
  .home-date { font: 500 11px/14px var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; }
  .home-title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .last-body { padding: 32px; }
  .last-actions { display: none; }
  .last-blob { width: 280px; height: 280px; top: -120px; right: -80px; }
  .last-name { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .last-roaster { font-size: 19px; line-height: 26px; }
  .last-score { font-size: 48px; }
  .last-note { font-size: 26px; line-height: 35px; color: var(--ink); -webkit-line-clamp: 3; }
  .recent-row { min-height: 76px; }
  .recent-name { font-size: 22px; line-height: 24px; }

  .home-rail {
    flex: 1 1 320px;
    min-width: 0;
    box-sizing: border-box;
    padding: 32px 24px 48px;
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .prepare--big { justify-content: space-between; gap: 16px; padding: 20px; }
  .prepare--big .prepare-text { gap: 6px; }
  .prepare-eyebrow { opacity: 0.7; }
  .prepare--big .prepare-title { font-size: 30px; line-height: 30px; }
  .prepare--big .prepare-sub { font: italic 400 15px/22px var(--font-display); opacity: 0.8; }
  .prepare-go { flex: none; width: 48px; height: 48px; border-radius: 9999px; background: var(--accent); color: var(--on-accent); display: flex; align-items: center; justify-content: center; }

  .shortcuts { display: flex; flex-direction: column; padding: 0 16px; border-radius: 14px; background: var(--surface); }
  .shortcut { display: flex; align-items: center; gap: 12px; min-height: 64px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
  .shortcut:last-child { border-bottom: 0; }
  .shortcut-icon { flex: none; color: var(--primary); }
  .shortcut-text { flex: 1; display: flex; flex-direction: column; }
  .shortcut-title { font: 600 15px/22px var(--font-sans); }
  .shortcut-chevron { flex: none; color: var(--ink-soft); }

  .month-tiles { display: flex; flex-direction: column; gap: 12px; }
  .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .tile { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 14px; background: var(--surface); }
  .tile-num { font: 400 30px/30px var(--font-display); }
  .tile-num--avg { color: var(--primary); }
}
</style>
