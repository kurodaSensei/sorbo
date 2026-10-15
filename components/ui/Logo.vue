<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

type Variant = 'mark' | 'wordmark' | 'lockup'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    /** Tone applied to the wordmark text (mark always uses the brand SVG). */
    tone?: 'moss' | 'paper' | 'olive'
    class?: string
  }>(),
  {
    variant: 'mark',
    size: 'md',
    tone: 'moss',
  },
)

// Mark sizes (the SVG keeps its baked-in olive bg, paper "S", honey ".")
const markSizePx: Record<Size, number> = {
  sm: 36,
  md: 48,
  lg: 64,
}

const wordmarkSizeClass: Record<Size, string> = {
  sm: 'text-[28px]',
  md: 'text-[40px]',
  lg: 'text-[56px]',
}

const wordmarkColor = computed(() => {
  if (props.tone === 'paper') return 'text-paper'
  if (props.tone === 'olive') return 'text-olive'
  return 'text-moss'
})

const markPx = computed(() => markSizePx[props.size])
</script>

<template>
  <div :class="cn('inline-flex items-center gap-sm', $props.class)" aria-label="Sorbo">
    <!-- Mark — brand SVG (olive square + paper "S" + honey dot) -->
    <img
      v-if="variant === 'mark' || variant === 'lockup'"
      src="/sorbo.svg"
      :width="markPx"
      :height="markPx"
      alt=""
      aria-hidden="true"
      class="block shrink-0"
      :style="{ width: `${markPx}px`, height: `${markPx}px` }"
    >

    <!-- Wordmark -->
    <div
      v-if="variant === 'wordmark' || variant === 'lockup'"
      :class="cn('flex flex-col leading-none', variant === 'lockup' && 'gap-xxs')"
    >
      <span :class="cn('font-display leading-none', wordmarkSizeClass[size], wordmarkColor)">
        Sorbo<span class="text-honey">.</span>
      </span>
      <span
        v-if="variant === 'lockup'"
        class="font-mono text-eyebrow font-medium uppercase tracking-eyebrow text-moss-soft"
      >
        — by KurodaCafe
      </span>
    </div>
  </div>
</template>
