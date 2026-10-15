<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const { currentInfo, closeInfo } = useInfoSheet()

const open = ref(false)

watch(currentInfo, (info) => {
  open.value = !!info
})

const info = computed(() => currentInfo.value)

function onOpenChange(v: boolean) {
  if (!v) closeInfo()
  open.value = v
}
</script>

<template>
  <UiBottomSheet
    :model-value="open"
    :title="info?.title || ''"
    @update:model-value="onOpenChange"
  >
    <div v-if="info" class="flex flex-col gap-md pt-xs">
      <p class="font-display text-[16px] leading-relaxed text-moss">
        {{ info.body }}
      </p>
      <div v-if="info.howTo" class="rounded-card-sm bg-surface-2 p-md">
        <UiEyebrow>Cómo notarlo</UiEyebrow>
        <p class="mt-xs font-display italic text-[14px] leading-relaxed text-moss">
          {{ info.howTo }}
        </p>
      </div>
    </div>
  </UiBottomSheet>
</template>
