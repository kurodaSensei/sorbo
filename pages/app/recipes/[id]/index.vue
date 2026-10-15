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
</script>

<template>
  <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
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
