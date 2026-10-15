<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_VARIETIES } from '~/utils/constants'

const router = useRouter()
const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const draft = ref('')
const submitting = ref(false)

const allVarieties = computed(() => {
  const custom = settings.prefs?.customVarieties ?? []
  return [...new Set([...DEFAULT_VARIETIES, ...custom])].sort()
})

const active = computed(() => {
  const disabled = settings.prefs?.disabledVarieties ?? []
  return allVarieties.value.filter(v => !disabled.includes(v))
})

const inactive = computed(() => {
  const disabled = settings.prefs?.disabledVarieties ?? []
  return allVarieties.value.filter(v => disabled.includes(v))
})

async function commit() {
  const v = draft.value.trim()
  if (!v || submitting.value) return
  submitting.value = true
  try {
    await settings.addVariety(v)
    draft.value = ''
  }
  finally {
    submitting.value = false
  }
}

async function toggle(name: string) {
  await settings.toggleDefaultVariety(name)
}
</script>

<template>
  <div class="mx-auto w-full max-w-[640px] px-md pt-md pb-2xl lg:px-xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>Catálogo</UiEyebrow>
      <div class="size-[44px]" aria-hidden="true" />
    </header>

    <h1 class="mt-md font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px]">
      Tus <span class="italic text-olive">variedades</span>
    </h1>
    <p class="subtitle-italic mt-xs">
      Caturra, Geisha, Bourbon…
    </p>

    <!-- Add new -->
    <div class="mt-xl flex flex-col gap-xs pt-[14px] pb-[13px] border-b transition-colors duration-150 ease-sorbo"
         :class="draft ? 'border-moss' : 'border-moss/10'">
      <div class="flex items-baseline justify-between gap-md">
        <label for="add-variety" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
          <span aria-hidden="true">— </span>Añadir variedad
        </label>
        <span class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost">
          Enter
        </span>
      </div>
      <input
        id="add-variety"
        v-model="draft"
        type="text"
        placeholder="Escribe y enter"
        class="w-full bg-transparent border-0 p-0 leading-none text-moss outline-none font-display italic text-[18px] placeholder:text-moss-ghost"
        @keydown.enter.prevent="commit"
      >
    </div>

    <!-- Active -->
    <section class="mt-xl">
      <UiEyebrow>Activas · {{ active.length }}</UiEyebrow>
      <div v-if="active.length > 0" class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="v in active"
          :key="v"
          interactive
          variant="active"
          @click="toggle(v)"
        >
          {{ v }}
        </UiChip>
      </div>
      <p v-else class="mt-sm font-display italic text-[14px] text-moss-soft">
        No tienes variedades activas. Toca una inactiva para reactivarla.
      </p>
    </section>

    <!-- Inactive -->
    <section v-if="inactive.length > 0" class="mt-xl">
      <UiEyebrow>Inactivas · {{ inactive.length }}</UiEyebrow>
      <div class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="v in inactive"
          :key="v"
          interactive
          variant="ghost"
          @click="toggle(v)"
        >
          {{ v }}
        </UiChip>
      </div>
    </section>
  </div>
</template>
