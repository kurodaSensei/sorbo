<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_FLAVOR_NOTES } from '~/utils/constants'

const router = useRouter()
const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const draft = ref('')
const submitting = ref(false)

const allNotes = computed(() => {
  const custom = settings.prefs?.customFlavorNotes ?? []
  return [...new Set([...DEFAULT_FLAVOR_NOTES, ...custom])].sort()
})

const active = computed(() => {
  const disabled = settings.prefs?.disabledFlavorNotes ?? []
  return allNotes.value.filter(n => !disabled.includes(n))
})

const inactive = computed(() => {
  const disabled = settings.prefs?.disabledFlavorNotes ?? []
  return allNotes.value.filter(n => disabled.includes(n))
})

async function commit() {
  const v = draft.value.trim()
  if (!v || submitting.value) return
  submitting.value = true
  try {
    await settings.addFlavorNote(v)
    draft.value = ''
  }
  finally {
    submitting.value = false
  }
}

async function toggle(name: string) {
  await settings.toggleDefaultFlavorNote(name)
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
      Tus <span class="italic text-olive">notas</span>
    </h1>
    <p class="subtitle-italic mt-xs">
      Lo que reconoces en taza.
    </p>

    <div class="mt-xl flex flex-col gap-xs pt-[14px] pb-[13px] border-b transition-colors duration-150 ease-sorbo"
         :class="draft ? 'border-moss' : 'border-moss/10'">
      <div class="flex items-baseline justify-between gap-md">
        <label for="add-note" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
          <span aria-hidden="true">— </span>Añadir nota
        </label>
        <span class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost">
          Enter
        </span>
      </div>
      <input
        id="add-note"
        v-model="draft"
        type="text"
        placeholder="Mandarina, panela…"
        class="w-full bg-transparent border-0 p-0 leading-none text-moss outline-none font-display italic text-[18px] placeholder:text-moss-ghost"
        @keydown.enter.prevent="commit"
      >
    </div>

    <section class="mt-xl">
      <UiEyebrow>Activas · {{ active.length }}</UiEyebrow>
      <div v-if="active.length > 0" class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="n in active"
          :key="n"
          interactive
          variant="active"
          @click="toggle(n)"
        >
          {{ n }}
        </UiChip>
      </div>
      <p v-else class="mt-sm font-display italic text-[14px] text-moss-soft">
        No tienes notas activas. Toca una inactiva para reactivarla.
      </p>
    </section>

    <section v-if="inactive.length > 0" class="mt-xl">
      <UiEyebrow>Inactivas · {{ inactive.length }}</UiEyebrow>
      <div class="mt-sm flex flex-wrap gap-xxs">
        <UiChip
          v-for="n in inactive"
          :key="n"
          interactive
          variant="ghost"
          @click="toggle(n)"
        >
          {{ n }}
        </UiChip>
      </div>
    </section>
  </div>
</template>
