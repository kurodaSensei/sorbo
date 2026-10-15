<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Toaster } from 'vue-sonner'

const { authLoading } = useAuth()
const { iosSheetOpen, androidSheetOpen } = usePwaInstall()

// Mantenemos el splash brevemente para evitar flashes en cargas
// instantáneas. 300ms es suficiente para suavizar la transición sin
// bloquear LCP. (Antes 1500ms causaba que el LCP se midiera contra el
// splash, no contra el contenido real — penalizaba Core Web Vitals.)
const MIN_SPLASH_MS = 300
const splashHeld = ref(true)

onMounted(() => {
  setTimeout(() => {
    splashHeld.value = false
  }, MIN_SPLASH_MS)
})

const showSplash = computed(() => authLoading.value || splashHeld.value)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <Transition
    enter-active-class="transition-opacity duration-300 ease-sorbo"
    leave-active-class="transition-opacity duration-500 ease-sorbo"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <UiSplash v-if="showSplash" />
  </Transition>

  <UiPwaIosInstructions v-model="iosSheetOpen" />
  <UiPwaAndroidInstructions v-model="androidSheetOpen" />
  <UiConfirm />
  <UiInfoSheet />

  <Toaster
    position="bottom-center"
    rich-colors
    :offset="120"
    :mobile-offset="{ bottom: '110px' }"
    :toast-options="{
      style: {
        fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif',
        background: 'var(--paper)',
        color: 'var(--moss)',
        border: '1px solid rgba(47, 53, 40, 0.12)',
      },
    }"
  />
</template>
