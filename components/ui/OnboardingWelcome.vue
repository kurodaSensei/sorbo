<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  userName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'finish': []
}>()

interface Slide {
  eyebrow: string
  title: string
  italicWord: string
  body: string
}

// 3 slides · comprimido de 5. Los usuarios que dicen "es complicada"
// se estancan en walkthroughs largos. La activación real ocurre cuando
// el usuario registra su primer café — el welcome solo tiene que darle
// contexto suficiente para saber qué hacer.
const slides: Slide[] = [
  {
    eyebrow: 'Hola',
    title: 'Tu diario de',
    italicWord: 'café',
    body: 'Guarda cada café que pruebes, puntúa la taza y anota qué te supo. Sin tecnicismos.',
  },
  {
    eyebrow: 'Empieza aquí',
    title: 'Registra un',
    italicWord: 'café',
    body: 'El que tienes ahora en la cafetera o el que compraste ayer. Solo el nombre es obligatorio — 30 segundos.',
  },
  {
    eyebrow: 'Cuando quieras',
    title: 'Descubre a la',
    italicWord: 'comunidad',
    body: 'En Explora aparece lo que otros cafeteros comparten. Invita amigos o guarda un café que te llamó la atención.',
  },
]

const { trackEvent } = useAnalytics()

const index = ref(0)
const isLast = computed(() => index.value === slides.length - 1)
const currentSlide = computed(() => slides[index.value])

function next() {
  if (isLast.value) finish(false)
  else index.value++
}

function back() {
  if (index.value > 0) index.value--
}

function finish(skipped = false) {
  if (!skipped) {
    trackEvent('welcome_completed', { slides: slides.length })
  }
  emit('finish')
  emit('update:modelValue', false)
  // Reset for next mount in case the user logs out and back in
  setTimeout(() => { index.value = 0 }, 300)
}
</script>

<template>
  <UiBottomSheet :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-md min-h-[60svh] lg:min-h-0">
      <div class="flex items-center justify-between gap-md">
        <UiEyebrow>{{ currentSlide.eyebrow }}</UiEyebrow>
        <!-- Skip prominente arriba — Jordan que ya conoce productos similares
             no debería tener que taps 3 veces para salir. -->
        <button
          type="button"
          class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft hover:text-moss transition-colors"
          @click="finish(true)"
        >
          Saltar
        </button>
      </div>

      <h2 class="font-display tracking-[-0.02em] leading-[1.02] text-moss text-[40px] sm:text-[48px]">
        <template v-if="index === 0 && userName">
          Hola <span class="italic text-olive">{{ userName }}</span>.<br>
        </template>
        {{ currentSlide.title }}
        <span class="italic text-olive">{{ currentSlide.italicWord }}</span>.
      </h2>

      <p class="font-display italic text-[18px] leading-relaxed text-moss-soft">
        "{{ currentSlide.body }}"
      </p>

      <!-- Progress dots -->
      <div class="flex items-center gap-xs pt-md" role="tablist" aria-label="Progreso del recorrido">
        <span
          v-for="(s, i) in slides"
          :key="i"
          aria-hidden="true"
          :class="[
            'h-[6px] rounded-pill transition-all duration-200 ease-sorbo',
            i === index ? 'w-[24px] bg-olive' : 'w-[6px] bg-moss/15',
          ]"
        />
      </div>

      <!-- Actions — sin Skip duplicado (ya está arriba). Atrás + Siguiente. -->
      <div class="flex items-center gap-xs pt-md mt-auto">
        <UiButton
          v-if="index > 0"
          variant="ghost"
          :block="false"
          @click="back"
        >
          Atrás
        </UiButton>
        <div class="flex-1" />
        <UiButton
          variant="primary"
          :block="false"
          @click="next"
        >
          {{ isLast ? 'Empezar →' : 'Siguiente →' }}
        </UiButton>
      </div>
    </div>
  </UiBottomSheet>
</template>
