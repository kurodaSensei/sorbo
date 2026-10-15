<script setup lang="ts">
import { cn } from '~/lib/utils'

export interface SegmentItem {
  key: string
  label: string
  count?: number
}

defineProps<{
  items: SegmentItem[]
  modelValue: string
  class?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [key: string] }>()
</script>

<template>
  <div
    role="tablist"
    :class="cn('inline-flex items-center gap-xxs', $props.class)"
  >
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.key"
      :class="
        cn(
          'inline-flex items-center gap-xxs rounded-pill px-md py-[8px]',
          'font-mono text-[10px] font-medium uppercase tracking-eyebrow',
          'transition-colors duration-150 ease-sorbo whitespace-nowrap',
          modelValue === item.key
            ? 'bg-surface-2 text-moss'
            : 'text-moss-soft hover:text-moss',
        )
      "
      @click="emit('update:modelValue', item.key)"
    >
      <span>{{ item.label }}</span>
      <span v-if="item.count !== undefined" class="opacity-70">· {{ item.count }}</span>
    </button>
  </div>
</template>
