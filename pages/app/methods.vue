<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_BREW_METHOD_OPTIONS } from '~/utils/constants'

const router = useRouter()
const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const draft = ref('')
const submitting = ref(false)

interface MethodOption { value: string; label: string }

const allMethods = computed<MethodOption[]>(() => {
  const custom = settings.prefs?.customBrewMethods ?? []
  const seen = new Set<string>()
  return [...DEFAULT_BREW_METHOD_OPTIONS, ...custom]
    .filter((m) => {
      if (seen.has(m.value)) return false
      seen.add(m.value)
      return true
    })
    .sort((a, b) => a.label.localeCompare(b.label))
})

const active = computed(() => {
  const disabled = settings.prefs?.disabledBrewMethods ?? []
  return allMethods.value.filter(m => !disabled.includes(m.value))
})

const inactive = computed(() => {
  const disabled = settings.prefs?.disabledBrewMethods ?? []
  return allMethods.value.filter(m => disabled.includes(m.value))
})

async function commit() {
  const label = draft.value.trim()
  if (!label || submitting.value) return
  submitting.value = true
  try {
    await settings.addBrewMethod(label)
    draft.value = ''
  }
  finally {
    submitting.value = false
  }
}

async function toggle(value: string) {
  await settings.toggleDefaultBrewMethod(value)
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
      Tus <span class="italic text-olive">métodos</span>
    </h1>
    <p class="subtitle-italic mt-xs">
      Cómo extraes el café.
    </p>

    <div class="mt-xl flex flex-col gap-xs pt-[14px] pb-[13px] border-b transition-colors duration-150 ease-sorbo"
         :class="draft ? 'border-moss' : 'border-moss/10'">
      <div class="flex items-baseline justify-between gap-md">
        <label for="add-method" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
          <span aria-hidden="true">— </span>Añadir método
        </label>
        <span class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost">
          Enter
        </span>
      </div>
      <input
        id="add-method"
        v-model="draft"
        type="text"
        placeholder="V60, AeroPress…"
        class="w-full bg-transparent border-0 p-0 leading-none text-moss outline-none font-display italic text-[18px] placeholder:text-moss-ghost"
        @keydown.enter.prevent="commit"
      >
    </div>

    <section class="mt-xl">
      <UiEyebrow>Activos · {{ active.length }}</UiEyebrow>
      <div v-if="active.length > 0" class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="m in active"
          :key="m.value"
          interactive
          variant="active"
          @click="toggle(m.value)"
        >
          {{ m.label }}
        </UiChip>
      </div>
      <p v-else class="mt-sm font-display italic text-[14px] text-moss-soft">
        No tienes métodos activos. Toca uno inactivo para reactivarlo.
      </p>
    </section>

    <section v-if="inactive.length > 0" class="mt-xl">
      <UiEyebrow>Inactivos · {{ inactive.length }}</UiEyebrow>
      <div class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="m in inactive"
          :key="m.value"
          interactive
          variant="ghost"
          @click="toggle(m.value)"
        >
          {{ m.label }}
        </UiChip>
      </div>
    </section>
  </div>
</template>
