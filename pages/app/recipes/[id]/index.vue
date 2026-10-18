<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe, Visibility } from '~/types'

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const recipesStore = useRecipesStore()
const { getBrewMethodLabel } = useCatalog()

const id = computed(() => route.params.id as string)
const recipe = ref<Recipe | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Solo el dueño edita/elimina/comparte; una receta de comunidad ajena es de
// solo lectura.
const isOwner = computed(() => !!recipe.value && recipe.value.userId === userId.value)

onMounted(async () => {
  try {
    await recipesStore.loadById(id.value)
    recipe.value = recipesStore.current as Recipe | null
    if (!recipe.value) notFound.value = true
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const shareOpen = ref(false)

function onShare() {
  if (!recipe.value) return
  shareOpen.value = true
}

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (recipe.value) recipe.value = { ...recipe.value, visibility, sharedWith: uids }
}

const deleting = ref(false)

function onEdit() {
  if (!recipe.value) return
  router.push(`/app/recipes/${recipe.value.id}/edit`)
}

const { confirm } = useConfirm()

async function onDelete() {
  if (!recipe.value || deleting.value) return
  const ok = await confirm({
    title: `Eliminar "${recipe.value.name}"`,
    message: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await recipesStore.remove(recipe.value.id)
    router.replace('/app/recipes')
  }
  finally {
    deleting.value = false
  }
}

// ─── Detalle v3 (interruptor «recetas») ───────────────────────────────────
const v3 = useFlag('recetas')
const timer = useRecipeTimer(computed(() => recipe.value?.steps || []))

const displayName = computed(() => (recipe.value?.name || '').trim().replace(/\.+$/, ''))
const byline = computed(() => {
  const r = recipe.value
  if (!r) return ''
  const a = r.author?.trim()
  const author = a && a.toLowerCase() !== 'desconocido' ? `de ${a}` : ''
  return [getBrewMethodLabel(r.brewMethod), author].filter(Boolean).join(' · ')
})
const params = computed(() => {
  const r = recipe.value
  if (!r) return []
  return [
    { k: 'Dosis', v: r.dose ? `${r.dose} g` : '' },
    { k: 'Agua', v: r.water ? `${r.water} ml` : '' },
    { k: 'Ratio', v: r.ratio || (r.water && r.dose ? `1:${Math.round(r.water / r.dose)}` : ''), key: true },
    { k: 'Temp', v: r.waterTemp ? `${r.waterTemp}°` : '' },
    { k: 'Molienda', v: grindLabel(r.grindSize) || '' },
  ].filter(x => x.v)
})
const current = computed(() => timer.sorted.value[timer.activeIndex.value] ?? null)
const upcoming = computed(() => timer.sorted.value[timer.activeIndex.value + 1] ?? null)
const progress = computed(() =>
  timer.totalSeconds.value ? Math.min(100, (timer.elapsedSeconds.value / timer.totalSeconds.value) * 100) : 0,
)

const menuOpen = ref(false)
function onMenuKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
function runMenu(fn: () => void | Promise<void>) {
  menuOpen.value = false
  fn()
}
</script>

<template>
  <div v-if="v3" class="v3 detail">
    <nav class="topbar" aria-label="Acciones de la receta">
      <button type="button" class="back" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" /><span class="back-label">Tus recetas</span>
      </button>
      <div v-if="recipe && isOwner" class="top-actions">
        <button type="button" class="icon-btn mobile-only" aria-label="Compartir" @click="onShare"><Icon name="lucide:share-2" size="20" /></button>
        <button type="button" class="icon-btn mobile-only" aria-label="Más acciones: editar o eliminar" @click="menuOpen = true"><Icon name="lucide:ellipsis" size="20" /></button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onShare">Compartir</button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onEdit">Editar</button>
        <button type="button" class="v3-btn small danger desktop-only" :disabled="deleting" @click="onDelete">Eliminar</button>
      </div>
    </nav>

    <div v-if="loading" class="state"><span class="v3-spinner" aria-label="Cargando" /></div>

    <div v-else-if="notFound" class="state">
      <p class="state-text">No encontramos esta receta.</p>
      <NuxtLink to="/app/recipes" class="v3-btn v3-btn--primary">Volver a mis recetas</NuxtLink>
    </div>

    <div v-else-if="recipe" :class="['layout', { 'layout--timer': timer.sorted.value.length }]">
      <div class="main">
        <article aria-labelledby="recipe-name" class="hero">
          <span class="blob" :style="methodBlobStyle(recipe.brewMethod)" aria-hidden="true" />
          <div class="hero-in">
            <div class="hero-top">
              <div class="hero-id">
                <h1 id="recipe-name" class="name">{{ displayName }}</h1>
                <p v-if="byline" class="byline">{{ byline }}</p>
                <p v-if="recipe.bestFor" class="best">«{{ recipe.bestFor }}»</p>
              </div>
              <div v-if="timer.totalSeconds.value" class="total">
                <span class="total-num">{{ formatClock(timer.totalSeconds.value) }}</span>
                <span class="v3-meta total-lab">de paciencia</span>
              </div>
            </div>
            <dl v-if="params.length" class="params">
              <div v-for="pm in params" :key="pm.k" :class="['param', { 'param--key': pm.key }]"><dt>{{ pm.k }}</dt><dd>{{ pm.v }}</dd></div>
            </dl>
          </div>
        </article>

        <section aria-labelledby="recipe-steps" class="steps">
          <h2 id="recipe-steps" class="section-title">Los pasos</h2>
          <ol v-if="timer.sorted.value.length" class="step-list">
            <li
              v-for="(st, i) in timer.sorted.value"
              :key="i"
              :aria-current="timer.activeIndex.value === i ? 'step' : undefined"
              :class="['step', { 'step--on': timer.activeIndex.value === i, 'step--past': i < timer.activeIndex.value }]"
            >
              <span class="step-time">{{ formatClock(st.timeSeconds) }}</span>
              <span class="step-text"><span class="step-title">{{ st.title }}</span><span v-if="st.description" class="v3-meta">{{ st.description }}</span></span>
              <Icon v-if="i < timer.activeIndex.value" name="lucide:check" size="18" class="step-check" aria-label="Hecho" />
            </li>
          </ol>
          <p v-else class="state-text">Esta receta aún no tiene pasos.</p>
        </section>
      </div>

      <aside class="side">
        <section v-if="timer.sorted.value.length" role="timer" aria-label="Timer de la receta" class="panel desktop-only">
          <span class="v3-eyebrow panel-eb">— Timer<template v-if="timer.activeIndex.value >= 0"> · paso {{ timer.activeIndex.value + 1 }} de {{ timer.sorted.value.length }}</template></span>
          <span class="panel-clock"><span class="panel-num">{{ formatClock(timer.elapsedSeconds.value) }}</span><span class="panel-of">de {{ formatClock(timer.totalSeconds.value) }}</span></span>
          <span class="bar" aria-hidden="true"><span class="bar-fill" :style="{ width: `${progress}%` }" /></span>
          <span v-if="timer.finished.value" class="panel-now">Listo. Disfruta tu sorbo.</span>
          <span v-else-if="current" class="panel-step">
            <span class="panel-lab">Ahora</span>
            <span class="panel-now">{{ current.title }}</span>
            <span v-if="upcoming" class="panel-lab">Sigue: {{ upcoming.title }} a la {{ formatClock(upcoming.timeSeconds) }}</span>
          </span>
          <span v-else class="panel-lab">{{ timer.sorted.value.length }} pasos. El timer te guía por cada uno.</span>
          <span class="panel-actions">
            <button v-if="timer.finished.value" type="button" class="v3-btn go" @click="timer.reset">De nuevo</button>
            <button v-else type="button" class="v3-btn go" @click="timer.toggle">
              <Icon :name="timer.running.value ? 'lucide:pause' : 'lucide:play'" size="18" />
              {{ timer.running.value ? 'Pausar' : timer.started.value ? 'Continuar' : 'Iniciar timer' }}
            </button>
            <button v-if="timer.started.value && !timer.finished.value" type="button" class="v3-btn ghost-dark" @click="timer.reset">Reiniciar</button>
          </span>
        </section>

        <section v-if="isOwner" aria-label="Siguiente" class="next">
          <NuxtLink to="/app/tastings/new" class="next-row">
            <span class="next-text"><span class="next-title">Cata con esta receta</span><span class="v3-meta">Método: {{ getBrewMethodLabel(recipe.brewMethod) }}</span></span>
            <Icon name="lucide:chevron-right" size="18" class="next-chevron" />
          </NuxtLink>
          <NuxtLink to="/app/recipes" class="next-row">
            <span class="next-title">Otras recetas</span>
            <Icon name="lucide:chevron-right" size="18" class="next-chevron" />
          </NuxtLink>
        </section>
      </aside>

      <div v-if="timer.sorted.value.length" class="timer-bar mobile-only">
        <button v-if="!timer.started.value" type="button" class="v3-btn v3-btn--primary start" @click="timer.start">
          <span class="start-main"><Icon name="lucide:play" size="20" />Iniciar timer</span>
          <span class="start-meta">{{ timer.sorted.value.length }} pasos · {{ formatClock(timer.totalSeconds.value) }}</span>
        </button>
        <div v-else-if="timer.finished.value" class="bar-done" role="status">
          <span class="bar-text"><span class="bar-title">Listo. Disfruta tu sorbo.</span><span class="bar-sub">{{ formatClock(timer.totalSeconds.value) }} en total</span></span>
          <button type="button" class="v3-btn again" @click="timer.reset">De nuevo</button>
        </div>
        <div v-else role="timer" aria-label="Timer de la receta" class="bar-run">
          <span class="bar-text"><span class="bar-clock">{{ formatClock(timer.elapsedSeconds.value) }}</span><span class="bar-sub">Ahora: {{ current?.title }}</span></span>
          <button type="button" class="round round--soft" aria-label="Reiniciar timer" @click="timer.reset"><Icon name="lucide:rotate-ccw" size="18" /></button>
          <button type="button" class="round round--go" :aria-label="timer.running.value ? 'Pausar' : 'Continuar'" @click="timer.toggle">
            <Icon :name="timer.running.value ? 'lucide:pause' : 'lucide:play'" size="22" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="v3-sheet">
        <div v-if="menuOpen" class="v3 v3-sheet-wrap" @keydown="onMenuKey">
          <div class="v3-sheet-veil" aria-hidden="true" @click="menuOpen = false" />
          <section role="dialog" aria-modal="true" aria-labelledby="recipe-menu-title" class="v3-sheet">
            <span class="v3-sheet-handle" aria-hidden="true" />
            <div class="v3-sheet-head">
              <h2 id="recipe-menu-title" class="v3-sheet-title">{{ recipe?.name }}</h2>
              <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="menuOpen = false"><Icon name="lucide:x" size="20" /></button>
            </div>
            <div class="menu">
              <button type="button" class="menu-item" @click="runMenu(onEdit)"><Icon name="lucide:pencil" size="20" />Editar</button>
              <button type="button" class="menu-item menu-item--danger" @click="runMenu(onDelete)"><Icon name="lucide:trash-2" size="20" />Eliminar</button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <UiShareSheet
      v-if="recipe"
      v-model="shareOpen"
      :entity-name="recipe.name"
      entity-kind="recipe"
      :initial-visibility="recipe.visibility ?? 'private'"
      :initial-shared-with="recipe.sharedWith ?? []"
      :on-save="(visibility, uids) => recipesStore.updateVisibility(recipe!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>

  <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>{{ recipe ? getBrewMethodLabel(recipe.brewMethod) : 'Receta' }}</UiEyebrow>
      <UiActionMenu v-if="recipe && isOwner" aria-label="Más acciones">
        <UiActionMenuItem icon="lucide:share-2" @click="onShare">
          Compartir
        </UiActionMenuItem>
        <UiActionMenuItem icon="lucide:pencil" @click="onEdit">
          Editar
        </UiActionMenuItem>
        <UiActionMenuItem destructive icon="lucide:trash-2" @click="onDelete">
          Eliminar
        </UiActionMenuItem>
      </UiActionMenu>
      <div v-else class="size-[44px]" aria-hidden="true" />
    </header>

    <div class="mt-lg max-w-[640px] mx-auto">
      <div v-if="loading" class="flex justify-center py-2xl">
        <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
      </div>

      <div v-else-if="notFound" class="flex flex-col items-center gap-lg py-2xl">
        <p class="font-display italic text-moss-soft text-center">
          No encontramos esta receta.
        </p>
        <UiButton variant="dark" :block="false" to="/app/recipes">
          Volver a mis recetas
        </UiButton>
      </div>

      <RecipeDetail v-else-if="recipe" :recipe="recipe" />

      <!-- Related actions — cierra el "vi esta receta, ¿ahora qué?".
           Cata usando esta receta lleva al wizard sin prefill de método
           (el wizard no lo soporta hoy) — user la selecciona. -->
      <section
        v-if="recipe && !loading && !notFound && isOwner"
        class="mt-2xl border-t border-moss/10 pt-lg"
      >
        <UiEyebrow>Siguiente</UiEyebrow>
        <div class="mt-sm grid grid-cols-1 sm:grid-cols-2 gap-sm">
          <UiQuickCard
            eyebrow="Prueba"
            label="Cata con esta receta"
            :hint="`Método: ${getBrewMethodLabel(recipe.brewMethod)}`"
            to="/app/tastings/new"
          />
          <UiQuickCard
            eyebrow="Explora"
            label="Otras recetas"
            hint="Volver a mi colección"
            to="/app/recipes"
          />
        </div>
      </section>
    </div>

    <UiShareSheet
      v-if="recipe"
      v-model="shareOpen"
      :entity-name="recipe.name"
      entity-kind="recipe"
      :initial-visibility="recipe.visibility ?? 'private'"
      :initial-shared-with="recipe.sharedWith ?? []"
      :on-save="(visibility, uids) => recipesStore.updateVisibility(recipe!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>
</template>

<style scoped>
.detail { box-sizing: border-box; max-width: 1180px; padding: 8px 20px 120px; display: flex; flex-direction: column; gap: 16px; }
.desktop-only { display: none !important; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.top-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.small { height: 40px; font-size: 14px; }
.danger { background: transparent; color: var(--danger); }
.danger:hover:not(:disabled) { background: var(--surface); }
.state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 0; }
.state-text { margin: 0; font: italic 400 17px/24px var(--font-display); color: var(--ink-soft); }
.layout { display: flex; flex-direction: column; gap: 24px; }
.layout--timer { padding-bottom: 96px; }
.main, .side { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.hero { position: relative; overflow: hidden; border-radius: 28px; background: var(--surface-strong); }
.blob { position: absolute; right: -90px; top: -110px; width: 320px; height: 320px; border-radius: 50%; pointer-events: none; }
.hero-in { position: relative; display: flex; flex-direction: column; gap: 16px; padding: 22px 20px 20px; }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.hero-id { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.name { margin: 0; font: 400 40px/0.98 var(--font-display); letter-spacing: -0.02em; overflow-wrap: anywhere; }
.byline { margin: 4px 0 0; font: italic 400 17px/22px var(--font-display); }
.best { margin: 0; font: italic 400 15px/22px var(--font-display); color: var(--ink-soft); }
.total { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.total-num { font: 400 52px/0.9 var(--font-display); letter-spacing: -0.02em; }
.total-lab { font-size: 12px; line-height: 16px; }
.params { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(76px, 1fr)); gap: 6px; }
.param { display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 14px; background: color-mix(in srgb, var(--bg) 70%, transparent); min-width: 0; }
.param dt { font: 400 11px/14px var(--font-sans); opacity: 0.8; }
.param dd { margin: 0; font: 400 18px/24px var(--font-display); white-space: nowrap; }
.param--key { background: var(--primary); color: var(--on-primary); }
.steps { display: flex; flex-direction: column; gap: 10px; }
.section-title { margin: 0; font: 400 24px/28px var(--font-display); }
.step-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.step { display: flex; gap: 14px; padding: 12px 14px; border-radius: 14px; background: var(--surface); transition: background-color 200ms; }
.step--on { background: color-mix(in srgb, var(--tint) 30%, var(--bg)); box-shadow: inset 3px 0 0 var(--primary); }
.step-time { flex: none; min-width: 44px; font: 500 13px/22px var(--font-mono); color: var(--ink-soft); }
.step--on .step-time { color: var(--primary); }
.step-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.step-title { font: 500 15px/22px var(--font-sans); }
.step--past .step-title { color: var(--ink-soft); }
.step-check { flex: none; margin-top: 2px; color: var(--primary); }
.next { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.next-row { display: flex; align-items: center; gap: 14px; min-height: 64px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
.next-row:last-child { border-bottom: 0; }
.next-text { flex: 1; display: flex; flex-direction: column; }
.next-title { flex: 1; font: 400 19px/22px var(--font-display); }
.next-chevron { flex: none; color: var(--ink-soft); }
.timer-bar { position: fixed; left: 0; right: 0; z-index: 20; bottom: calc(56px + env(safe-area-inset-bottom)); padding: 12px 20px; background: color-mix(in srgb, var(--bg) 95%, transparent); border-top: 1px solid var(--line); }
.start { width: 100%; height: 56px; justify-content: space-between; padding: 0 20px; font-size: 16px; }
.start-main { display: flex; align-items: center; gap: 10px; }
.start-meta { font: 400 13px/16px var(--font-sans); opacity: 0.85; }
.bar-run, .bar-done { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; border-radius: 18px; }
.bar-run { background: var(--brand-surface); color: var(--on-brand-surface); }
.bar-done { background: var(--tint); color: var(--on-tint); }
.bar-text { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.bar-clock { font: 400 34px/1 var(--font-display); }
.bar-title { font: 400 21px/26px var(--font-display); }
.bar-sub { font: 400 13px/18px var(--font-sans); opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.round { flex: none; border: 0; border-radius: 9999px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.round--soft { width: 44px; height: 44px; background: color-mix(in srgb, var(--on-brand-surface) 14%, transparent); color: var(--on-brand-surface); }
.round--go { width: 56px; height: 56px; background: var(--accent); color: var(--on-accent); }
.again { height: 44px; background: var(--bg); color: var(--ink); font-size: 14px; }
.menu { display: flex; flex-direction: column; padding: 4px 12px calc(20px + env(safe-area-inset-bottom)); }
.menu-item { display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 0 12px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); font: 500 16px/22px var(--font-sans); cursor: pointer; }
.menu-item:hover { background: var(--surface); }
.menu-item--danger { color: var(--danger); }
@media (prefers-reduced-motion: reduce) { .step { transition: none; } }

@media (min-width: 1024px) {
  .detail { padding: 24px 48px 64px; gap: 24px; }
  .mobile-only { display: none !important; }
  .desktop-only { display: flex !important; }
  .top-actions .desktop-only { display: inline-flex !important; }
  .back-label { display: inline; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .layout--timer { padding-bottom: 0; }
  .main { flex: 3 1 460px; gap: 28px; }
  .side { flex: 2 1 300px; position: sticky; top: 24px; gap: 16px; }
  .hero { border-radius: 32px; }
  .blob { right: -120px; top: -160px; width: 480px; height: 480px; }
  .hero-in { padding: 32px 32px 28px; gap: 20px; }
  .name { font-size: 64px; line-height: 0.95; }
  .byline { font-size: 22px; line-height: 28px; }
  .best { font-size: 18px; line-height: 26px; }
  .total-num { font-size: 80px; line-height: 0.85; }
  .params { grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
  .param { padding: 12px 14px; }
  .param dd { font-size: 24px; line-height: 28px; }
  .section-title { font-size: 28px; line-height: 32px; }
  .step { padding: 14px 16px; }
  .step-title { font-size: 16px; }
  .panel { flex-direction: column; gap: 16px; padding: 24px; border-radius: 24px; background: var(--brand-surface); color: var(--on-brand-surface); }
  .panel-eb { opacity: 0.7; }
  .panel-clock { display: flex; align-items: baseline; gap: 10px; }
  .panel-num { font: 400 72px/1 var(--font-display); }
  .panel-of, .panel-lab { font: 400 14px/20px var(--font-sans); opacity: 0.75; }
  .bar { height: 6px; border-radius: 9999px; background: color-mix(in srgb, var(--on-brand-surface) 18%, transparent); overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 9999px; background: var(--accent); transition: width 100ms linear; }
  .panel-step { display: flex; flex-direction: column; gap: 2px; }
  .panel-now { font: 400 22px/26px var(--font-display); }
  .panel-actions { display: flex; gap: 10px; }
  .go { flex: 1; background: var(--accent); color: var(--on-accent); }
  .ghost-dark { background: color-mix(in srgb, var(--on-brand-surface) 14%, transparent); color: var(--on-brand-surface); }
  .next { background: transparent; box-shadow: inset 0 0 0 1px var(--line); border-radius: 18px; padding: 4px 16px; }
}
</style>
