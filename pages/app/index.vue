<script setup lang="ts">
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
    process: proc,
    roasterName: t.roasterName,
    score: typeof t.ratingOverall === 'number' ? t.ratingOverall : null,
  }
})

const monthStartMs = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
})

const stats = computed(() => {
  const start = monthStartMs.value
  const monthCoffees = (coffeesStore.list as Coffee[]).filter(c => tsMillis(c.createdAt) >= start)
  const monthTastings = (tastingsStore.list as Tasting[]).filter(t =>
    (tsMillis(t.brewDate) || tsMillis(t.createdAt)) >= start,
  )
  const scores = monthTastings.map(t => t.ratingOverall).filter((s): s is number => typeof s === 'number')
  const avg = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null
  return {
    coffees: monthCoffees.length,
    tastings: monthTastings.length,
    avgScore: avg,
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-xl lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
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
