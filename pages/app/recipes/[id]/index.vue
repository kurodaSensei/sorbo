<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe, Visibility } from '~/types'
import { GRIND_SIZE_OPTIONS } from '~/utils/constants'
import { formatStepTime, ratioOf, sortSteps } from '~/utils/recipeForm'

// Receta v2: lectura con «Empezar» (temporizador) y «Compartir». Quien no es
// dueño la ve sin editar y puede guardarla en sus recetas.
definePageMeta({ hideTabBar: true })

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const recipesStore = useRecipesStore()
const { getBrewMethodLabel } = useCatalog()
const { confirm } = useConfirm()

const id = computed(() => route.params.id as string)
const recipe = ref<Recipe | null>(null)
const loading = ref(true)
const notFound = ref(false)

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

const grind = computed(() => GRIND_SIZE_OPTIONS.find(g => g.value === recipe.value?.grindSize)?.label)
const steps = computed(() => sortSteps(recipe.value?.steps ?? []))

const facts = computed(() => {
  const x = recipe.value
  if (!x) return []
  const out: { label: string, value: string, mono?: boolean }[] = [
    { label: 'Método', value: getBrewMethodLabel(x.brewMethod) },
    { label: 'Dosis', value: `${x.dose} g`, mono: true },
    { label: 'Agua', value: `${x.water} ml`, mono: true },
  ]
  if (x.waterTemp) out.push({ label: 'Temperatura', value: `${x.waterTemp} °C`, mono: true })
  const ratio = x.ratio || ratioOf(x.dose, x.water)
  if (ratio) out.push({ label: 'Proporción', value: ratio, mono: true })
  if (grind.value) out.push({ label: 'Molienda', value: grind.value })
  return out
})

const visibilityLabel = computed(() => {
  const v = recipe.value?.visibility
  if (v === 'community') return 'Pública en Descubrir'
  if (v === 'friends') return 'Compartida con tus amigos'
  return 'Solo tú la ves'
})

// ─── Acciones ──────────────────────────────────────────────────────────────
const shareOpen = ref(false)

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (recipe.value) recipe.value = { ...recipe.value, visibility, sharedWith: uids }
}

async function addToMine() {
  if (!recipe.value) return
  const newId = await recipesStore.duplicate(recipe.value)
  if (newId) router.replace(`/app/recipes/${newId}`)
}

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app/recipes')
}

async function onDelete() {
  if (!recipe.value) return
  const ok = await confirm({
    title: 'Eliminar receta',
    message: `«${recipe.value.name}» se borrará. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await recipesStore.remove(recipe.value.id)
    router.replace('/app/recipes')
  }
  catch { /* el store ya mostró el aviso */ }
}
</script>

<template>
  <div class="rd">
    <div v-if="loading" class="rd-state"><span class="rd-spin" aria-label="Cargando" /></div>

    <div v-else-if="notFound || !recipe" class="rd-state">
      <p>No encontramos esta receta.</p>
      <NuxtLink to="/app/recipes" class="rd-btn rd-secondary">Volver a Preparar</NuxtLink>
    </div>

    <template v-else>
      <div class="rd-bar">
        <button type="button" class="rd-icon" aria-label="Volver" @click="back">
          <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
        </button>
        <UiActionMenu v-if="isOwner" aria-label="Más opciones" icon="lucide:more-horizontal">
          <UiActionMenuItem icon="lucide:pencil" @click="router.push(`/app/recipes/${recipe.id}/edit`)">Editar</UiActionMenuItem>
          <UiActionMenuItem icon="lucide:share-2" @click="shareOpen = true">Quién la ve</UiActionMenuItem>
          <UiActionMenuItem destructive icon="lucide:trash-2" @click="onDelete">Eliminar</UiActionMenuItem>
        </UiActionMenu>
      </div>

      <div class="rd-body">
        <div class="rd-top">
          <h1 class="rd-name">{{ recipe.name }}</h1>
          <span v-if="recipe.author || (!isOwner && recipe.authorName)" class="rd-cap">
            {{ recipe.author ? `de ${recipe.author}` : '' }}{{ recipe.author && !isOwner && recipe.authorName ? ' · ' : '' }}{{ !isOwner && recipe.authorName ? `compartida por ${recipe.authorName}` : '' }}
          </span>
        </div>

        <div class="rd-grid">
          <div v-for="d in facts" :key="d.label">
            <span class="rd-cap">{{ d.label }}</span>
            <span :class="d.mono ? 'rd-mono' : 'rd-strong'">{{ d.value }}</span>
          </div>
        </div>

        <section v-if="steps.length" class="rd-sec">
          <h2 class="rd-label">Pasos</h2>
          <div class="rd-list">
            <div v-for="(s, i) in steps" :key="i" class="rd-row">
              <span class="rd-time">{{ formatStepTime(s.timeSeconds) }}</span>
              <span class="rd-col"><span class="rd-strong">{{ s.title }}</span><span v-if="s.description" class="rd-cap">{{ s.description }}</span></span>
            </div>
          </div>
        </section>

        <section v-if="recipe.instructions" class="rd-sec">
          <h2 class="rd-label">Notas</h2>
          <p class="rd-text">{{ recipe.instructions }}</p>
        </section>

        <section v-if="recipe.bestFor" class="rd-sec">
          <h2 class="rd-label">Ideal para</h2>
          <p class="rd-text">{{ recipe.bestFor }}</p>
        </section>

        <span v-if="isOwner" class="rd-cap rd-vis"><AppIcon name="users" :size="16" />{{ visibilityLabel }}</span>
      </div>

      <footer class="rd-foot">
        <NuxtLink :to="`/app/timer?receta=${recipe.id}`" class="rd-btn rd-primary">
          <AppIcon name="timer" :size="18" :stroke="2" />Empezar
        </NuxtLink>
        <button v-if="isOwner" type="button" class="rd-btn rd-secondary" @click="shareOpen = true">
          <AppIcon name="users" :size="18" :stroke="2" />Compartir
        </button>
        <button v-else type="button" class="rd-btn rd-secondary" @click="addToMine">
          <AppIcon name="plus" :size="18" :stroke="2" />Guardar
        </button>
      </footer>

      <UiShareSheet
        v-if="isOwner"
        v-model="shareOpen"
        :entity-name="recipe.name"
        entity-kind="recipe"
        :initial-visibility="recipe.visibility ?? 'private'"
        :initial-shared-with="recipe.sharedWith ?? []"
        :on-save="(visibility, uids) => recipesStore.updateVisibility(recipe!.id, visibility, uids)"
        @saved="onShareSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.rd { max-width: 640px; margin: 0 auto; min-height: 100svh; padding-bottom: calc(96px + env(safe-area-inset-bottom)); color: var(--ink); font-family: var(--font-sans); background: var(--bg); }
.rd-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 120px 16px; color: var(--ink-soft); }
.rd-spin { width: 24px; height: 24px; border-radius: 99px; border: 2px solid var(--line); border-top-color: var(--ink); animation: rd-spin 0.8s linear infinite; }
@keyframes rd-spin { to { transform: rotate(360deg); } }
.rd-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 8px 0; }
.rd-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 99px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.rd-body { padding: 4px 16px 0; display: flex; flex-direction: column; gap: 20px; }
.rd-top { display: flex; flex-direction: column; gap: 6px; }
.rd-name { margin: 0; font: 400 32px/34px var(--font-display); letter-spacing: -0.01em; }
.rd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--line); border-radius: var(--radius-md); overflow: hidden; }
.rd-grid > div { background: var(--surface); padding: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rd-cap { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.rd-strong { font: 600 15px/22px var(--font-sans); }
.rd-mono { font: 500 14px/20px var(--font-mono); }
.rd-sec { display: flex; flex-direction: column; gap: 8px; }
.rd-label { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.rd-list { border-radius: var(--radius-md); background: var(--surface); overflow: hidden; }
.rd-row { min-height: 56px; display: flex; align-items: center; gap: 14px; padding: 8px 14px; }
.rd-row + .rd-row { border-top: 1px solid var(--line); }
.rd-time { flex: none; width: 44px; font: 500 14px/20px var(--font-mono); }
.rd-col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rd-text { margin: 0; font-size: 15px; line-height: 22px; white-space: pre-line; }
.rd-vis { display: flex; align-items: center; gap: 8px; }
.rd-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); max-width: 640px; margin: 0 auto; }
.rd-btn { height: var(--button-height); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 15px/20px var(--font-sans); padding: 0 16px; }
.rd-primary { background: var(--primary); color: var(--on-primary); }
.rd-secondary { background: var(--surface); color: var(--ink); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) { .rd-foot { left: 260px; } }
</style>
