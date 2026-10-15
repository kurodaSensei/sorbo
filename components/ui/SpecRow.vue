<script setup lang="ts">
import { cn } from '~/lib/utils'

withDefaults(
  defineProps<{
    label: string
    /** Hide the bottom border when used as the last row. */
    bare?: boolean
    class?: string
  }>(),
  { bare: false },
)
</script>

<template>
  <div
    :class="
      cn(
        'flex items-baseline justify-between gap-md py-md',
        !bare && 'border-b border-moss/10',
        $props.class,
      )
    "
  >
    <span class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft shrink-0">
      {{ label }}
    </span>
    <span class="font-sans text-label text-moss text-right">
      <slot />
    </span>
  </div>
</template>
