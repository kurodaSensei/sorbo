<script setup lang="ts">
import { cn } from '~/lib/utils'

defineProps<{
  eyebrow?: string
  title?: string
  subtitle?: string
  to?: string
  href?: string
  class?: string
}>()

const baseClass = cn(
  'group relative block overflow-hidden rounded-card-lg bg-jungle text-paper text-left',
  'p-md sm:p-lg lg:p-xl',
  'transition-transform duration-200 ease-sorbo hover:-translate-y-[2px] active:translate-y-0',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey',
)
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="cn(baseClass, $props.class)">
    <div class="flex items-center justify-between gap-md h-full">
      <div class="flex flex-col gap-xs flex-1 min-w-0">
        <UiEyebrow class="text-paper/60">
          <slot name="eyebrow">{{ eyebrow }}</slot>
        </UiEyebrow>
        <h2 class="font-display tracking-[-0.01em] leading-[1.05] text-[28px] sm:text-[32px] lg:text-[44px] xl:text-[52px] text-paper">
          <slot>{{ title }}</slot>
        </h2>
        <p v-if="subtitle || $slots.subtitle" class="block font-display italic text-[13px] sm:text-[14px] lg:text-[16px] text-paper/70 mt-xs">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <span aria-hidden="true" class="flex shrink-0 items-center justify-center rounded-pill bg-honey text-jungle size-[40px] sm:size-[48px] lg:size-[64px] transition-transform duration-200 ease-sorbo group-hover:translate-x-[2px]">
        <Icon name="lucide:arrow-right" class="size-5 lg:size-6" />
      </span>
    </div>
  </NuxtLink>
  <a v-else-if="href" :href="href" :class="cn(baseClass, $props.class)">
    <div class="flex items-center justify-between gap-md h-full">
      <div class="flex flex-col gap-xs flex-1 min-w-0">
        <UiEyebrow class="text-paper/60">
          <slot name="eyebrow">{{ eyebrow }}</slot>
        </UiEyebrow>
        <h2 class="font-display tracking-[-0.01em] leading-[1.05] text-[28px] sm:text-[32px] lg:text-[44px] xl:text-[52px] text-paper">
          <slot>{{ title }}</slot>
        </h2>
        <p v-if="subtitle || $slots.subtitle" class="block font-display italic text-[13px] sm:text-[14px] lg:text-[16px] text-paper/70 mt-xs">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <span aria-hidden="true" class="flex shrink-0 items-center justify-center rounded-pill bg-honey text-jungle size-[40px] sm:size-[48px] lg:size-[64px] transition-transform duration-200 ease-sorbo group-hover:translate-x-[2px]">
        <Icon name="lucide:arrow-right" class="size-5 lg:size-6" />
      </span>
    </div>
  </a>
  <button v-else type="button" :class="cn(baseClass, $props.class)">
    <div class="flex items-center justify-between gap-md h-full">
      <div class="flex flex-col gap-xs flex-1 min-w-0">
        <UiEyebrow class="text-paper/60">
          <slot name="eyebrow">{{ eyebrow }}</slot>
        </UiEyebrow>
        <h2 class="font-display tracking-[-0.01em] leading-[1.05] text-[28px] sm:text-[32px] lg:text-[44px] xl:text-[52px] text-paper">
          <slot>{{ title }}</slot>
        </h2>
        <p v-if="subtitle || $slots.subtitle" class="block font-display italic text-[13px] sm:text-[14px] lg:text-[16px] text-paper/70 mt-xs">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <span aria-hidden="true" class="flex shrink-0 items-center justify-center rounded-pill bg-honey text-jungle size-[40px] sm:size-[48px] lg:size-[64px] transition-transform duration-200 ease-sorbo group-hover:translate-x-[2px]">
        <Icon name="lucide:arrow-right" class="size-5 lg:size-6" />
      </span>
    </div>
  </button>
</template>
