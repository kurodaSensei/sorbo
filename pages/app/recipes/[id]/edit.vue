<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe } from '~/types'

definePageMeta({ hideTabBar: true })

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()
const { userId } = useAuth()

const id = computed(() => route.params.id as string)
const recipe = ref<Recipe | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await recipesStore.loadById(id.value)
    recipe.value = recipesStore.current as Recipe | null
    // Solo el dueño edita; para otros, a la vista de solo lectura.
    if (!recipe.value) router.replace('/app/recipes')
    else if (recipe.value.userId !== userId.value) router.replace(`/app/recipes/${id.value}`)
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
  <div v-if="loading" class="re-state"><span class="re-spin" aria-label="Cargando" /></div>
  <RecipeForm v-else-if="recipe" :key="recipe.id" :recipe="recipe" />
</template>

<style scoped>
.re-state { display: flex; justify-content: center; padding: 120px 16px; }
.re-spin { width: 24px; height: 24px; border-radius: 99px; border: 2px solid var(--line); border-top-color: var(--ink); animation: re-spin 0.8s linear infinite; }
@keyframes re-spin { to { transform: rotate(360deg); } }
</style>
