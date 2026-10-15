<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe } from '~/types'

definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()

const id = computed(() => route.params.id as string)
const recipe = ref<Recipe | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await recipesStore.loadById(id.value)
    recipe.value = recipesStore.current as Recipe | null
    if (!recipe.value) router.replace('/app/recipes')
  }
  catch {
    router.replace('/app/recipes')
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="flex min-h-svh items-center justify-center bg-paper">
    <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
  </div>
  <RecipeWizard
    v-else-if="recipe"
    mode="edit"
    :recipe-id="id"
    :initial-recipe="recipe"
  />
</template>
