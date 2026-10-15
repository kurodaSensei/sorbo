<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Tasting } from '~/types'

definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()
const tastingsStore = useTastingsStore()

const id = computed(() => route.params.id as string)
const tasting = ref<Tasting | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await tastingsStore.loadById(id.value)
    tasting.value = tastingsStore.current as Tasting | null
    if (!tasting.value) {
      router.replace('/app/tastings')
    }
  }
  catch {
    router.replace('/app/tastings')
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
  <TastingWizard
    v-else-if="tasting"
    mode="edit"
    :tasting-id="id"
    :initial-tasting="tasting"
  />
</template>
