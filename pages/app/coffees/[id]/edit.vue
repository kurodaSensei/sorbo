<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee } from '~/types'

definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()
const coffeesStore = useCoffeesStore()

const id = computed(() => route.params.id as string)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await coffeesStore.loadById(id.value)
    coffee.value = coffeesStore.current as Coffee | null
    if (!coffee.value) {
      router.replace('/app/coffees')
    }
  }
  catch {
    router.replace('/app/coffees')
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
  <CoffeeWizard
    v-else-if="coffee"
    mode="edit"
    :coffee-id="id"
    :initial-coffee="coffee"
  />
</template>
