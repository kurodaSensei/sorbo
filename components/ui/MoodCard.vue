<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    /** Eyebrow text shown above the title (without the leading em-dash). */
    eyebrow?: string
    /** Big serif name (e.g. coffee name). */
    name?: string
    /** Italic subtitle (e.g. "de Libertario."). */
    subtitle?: string
    /** Score number (e.g. 86.5). When omitted the score block is hidden. */
    score?: number | string
    /** Eyebrow above the score number. */
    scoreLabel?: string
    /** Right-side meta line (e.g. "$60K · 250g"). */
    meta?: string
    /** Decorative blob color — uses honey by default. */
    blobTone?: 'honey' | 'olive-light' | 'surface-2' | 'peach' | 'none'
    /** Internal route — renders as NuxtLink when provided. */
    to?: string
    /** External href — renders as <a>. */
    href?: string
    /** Compact mode for dense grids (smaller name + tighter padding). */
    compact?: boolean
    class?: string
  }>(),
  {
    blobTone: 'honey',
    scoreLabel: 'Score SCA',
    compact: false,
  },
)

import { resolveComponent, computed } from 'vue'

const tag = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'article'
})

const interactive = computed(() => !!(props.to || props.href))

const hasScore = computed(() => {
  const s = props.score
  return s != null && s !== '' && !(typeof s === 'number' && Number.isNaN(s))
})

// Use `opacity-N` instead of `bg-color/N` because Tailwind opacity modifiers
// don't reliably resolve when the underlying color is a CSS variable.
const blobToneClass: Record<'honey' | 'olive-light' | 'surface-2' | 'peach' | 'none', string> = {
  honey: 'bg-honey opacity-70',
  'olive-light': 'bg-olive-light opacity-60',
  'surface-2': 'bg-surface-2',
  peach: 'bg-terracotta opacity-40',
  none: 'hidden',
}
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :class="
      cn(
        'relative block overflow-hidden rounded-card-lg bg-surface text-moss',
        'transition-transform duration-200 ease-sorbo',
        interactive && 'hover:-translate-y-[2px] active:translate-y-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-soft',
        $props.class,
      )
    "
  >
    <span
      aria-hidden="true"
      :class="cn('pointer-events-none absolute -right-12 -top-12 h-[160px] w-[160px] rounded-full', blobToneClass[blobTone])"
    />

    <div :class="cn('relative flex flex-col gap-sm', compact ? 'p-md' : 'p-md sm:p-lg')">
      <UiEyebrow v-if="eyebrow || $slots.eyebrow">
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </UiEyebrow>

      <h3
        v-if="name || $slots.name"
        :class="cn('font-display tracking-[-0.01em] leading-[1.05] text-moss', compact ? 'text-[28px]' : 'text-display-l')"
      >
        <slot name="name">{{ name }}</slot>
      </h3>

      <p v-if="subtitle || $slots.subtitle" class="subtitle-italic">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>

      <div v-if="$slots.notes" class="flex flex-wrap gap-xxs pt-xxs">
        <slot name="notes" />
      </div>

      <div
        v-if="hasScore || meta || $slots.footer"
        class="mt-xs flex items-end justify-between gap-md"
      >
        <div v-if="hasScore" class="flex flex-col gap-xxs">
          <UiEyebrow>{{ scoreLabel }}</UiEyebrow>
          <span :class="cn('font-display leading-none text-moss', compact ? 'text-[24px]' : 'text-[32px]')">
            {{ score }}
          </span>
        </div>

        <slot name="footer">
          <span v-if="meta" class="mono-data text-moss-soft">{{ meta }}</span>
        </slot>
      </div>
    </div>
  </component>
</template>
