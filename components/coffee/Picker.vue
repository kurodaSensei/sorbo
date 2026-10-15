<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { Coffee, CoffeeProcess } from '~/types'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    /** Selected coffee id, or null when nothing is chosen. */
    modelValue: string | null
    label?: string
    placeholder?: string
    error?: string
    class?: string
  }>(),
  {
    placeholder: 'Busca por nombre o marca…',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const coffeesStore = useCoffeesStore()

const generatedId = useId()
const fieldId = computed(() => `coffee-picker-${generatedId}`)
const errorId = computed(() => `${fieldId.value}-error`)

const open = ref(false)
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!coffeesStore.list.length && !coffeesStore.loading) {
    coffeesStore.loadAll().catch(() => {})
  }
})

onClickOutside(containerRef, () => {
  open.value = false
})

const coffees = computed<Coffee[]>(() => (coffeesStore.list as Coffee[]) || [])

const selected = computed<Coffee | null>(
  () => coffees.value.find(c => c.id === props.modelValue) ?? null,
)

const filtered = computed<Coffee[]>(() => {
  const q = query.value.trim().toLowerCase()
  const all = coffees.value
  if (!q) return all
  return all.filter((c) => {
    const name = (c.name || '').toLowerCase()
    const roaster = (c.roasterName || '').toLowerCase()
    return name.includes(q) || roaster.includes(q)
  })
})

const borderClass = computed(() => {
  if (props.error) return 'border-terracotta'
  if (open.value) return 'border-moss'
  if (selected.value) return 'border-moss/30'
  return 'border-moss/10'
})

const processLabel: Record<CoffeeProcess, string> = {
  washed: 'LAVADO',
  natural: 'NATURAL',
  honey: 'HONEY',
  anaerobic: 'ANAERÓBICO',
  carbonic: 'CARBÓNICO',
  experimental: 'EXPERIMENTAL',
  other: '',
}

function coffeeEyebrow(c: Coffee): string {
  const proc = c.process ? (processLabel[c.process] || c.process.toUpperCase()) : ''
  const roaster = c.roasterName?.toUpperCase() || ''
  return [proc, roaster].filter(Boolean).join(' · ')
}

function expand() {
  open.value = true
  query.value = ''
}

function collapse() {
  open.value = false
}

function pick(c: Coffee) {
  emit('update:modelValue', c.id)
  query.value = ''
  collapse()
}

function clear() {
  emit('update:modelValue', null)
  query.value = ''
  open.value = true
  // Wait for the input to render before focusing.
  setTimeout(() => inputRef.value?.focus(), 0)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (filtered.value.length > 0) pick(filtered.value[0])
  }
  else if (e.key === 'Escape') {
    collapse()
    inputRef.value?.blur()
  }
}

// Si modelValue cambia desde fuera (prefill en edit), no abrimos el dropdown.
watch(
  () => props.modelValue,
  () => {
    if (props.modelValue) collapse()
  },
)
</script>

<template>
  <div ref="containerRef" :class="cn('relative', $props.class)">
    <div
      :class="
        cn(
          'flex flex-col gap-xs pt-[14px] pb-[13px] border-b transition-colors duration-150 ease-sorbo',
          borderClass,
        )
      "
    >
      <label
        v-if="label"
        :for="fieldId"
        class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft"
      >
        <span aria-hidden="true">— </span>{{ label }}
      </label>

      <!-- Selected coffee summary (collapsed state) -->
      <button
        v-if="selected && !open"
        type="button"
        class="w-full text-left flex items-center justify-between gap-md"
        @click="expand"
      >
        <div class="min-w-0">
          <UiEyebrow>{{ coffeeEyebrow(selected) }}</UiEyebrow>
          <div class="mt-xxs font-display text-[18px] leading-none text-moss truncate">
            {{ selected.name.endsWith('.') ? selected.name.slice(0, -1) : selected.name }}
          </div>
        </div>
        <Icon
          name="lucide:chevron-down"
          aria-hidden="true"
          class="size-4 text-moss-ghost shrink-0"
        />
      </button>

      <!-- Input (open state or no selection) -->
      <input
        v-else
        :id="fieldId"
        ref="inputRef"
        v-model="query"
        type="text"
        :placeholder="placeholder"
        autocomplete="off"
        spellcheck="false"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? errorId : undefined"
        :aria-expanded="open"
        aria-autocomplete="list"
        role="combobox"
        class="w-full bg-transparent border-0 p-0 leading-none text-moss outline-none font-display text-[18px] placeholder:text-moss-ghost placeholder:font-display placeholder:italic"
        @focus="expand"
        @keydown="onKeydown"
      >
    </div>

    <!-- Change selection button (when something is selected and collapsed) -->
    <button
      v-if="selected && !open"
      type="button"
      class="mt-xs inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
      @click="clear"
    >
      Cambiar café
    </button>

    <p
      v-if="error"
      :id="errorId"
      class="mt-xs font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
    >
      <span aria-hidden="true">— </span>{{ error }}
    </p>

    <Transition
      enter-active-class="transition-opacity duration-150 ease-sorbo"
      leave-active-class="transition-opacity duration-100 ease-sorbo"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute left-0 right-0 top-full mt-xs z-30 max-h-[320px] overflow-y-auto rounded-card-sm bg-paper border border-moss/10 shadow-[0_8px_24px_rgba(47,53,40,0.12)]"
        role="listbox"
      >
        <ul v-if="filtered.length > 0" class="flex flex-col py-xxs">
          <li v-for="c in filtered" :key="c.id">
            <button
              type="button"
              role="option"
              :aria-selected="modelValue === c.id"
              class="w-full text-left px-md py-sm flex flex-col gap-xxs transition-colors duration-150 ease-sorbo"
              :class="modelValue === c.id ? 'bg-surface-2' : 'hover:bg-surface-2'"
              @click="pick(c)"
            >
              <span class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
                {{ coffeeEyebrow(c) || '—' }}
              </span>
              <span class="font-display text-[16px] leading-none text-moss truncate">
                {{ c.name.endsWith('.') ? c.name.slice(0, -1) : c.name }}
              </span>
            </button>
          </li>
        </ul>
        <p
          v-else-if="coffeesStore.loading"
          class="px-md py-md font-display italic text-[13px] text-moss-soft"
        >
          Cargando cafés…
        </p>
        <p
          v-else-if="query.trim()"
          class="px-md py-md font-display italic text-[13px] text-moss-soft"
        >
          Ningún café coincide con «{{ query.trim() }}».
        </p>
        <p
          v-else
          class="px-md py-md font-display italic text-[13px] text-moss-soft"
        >
          Aún no tienes cafés guardados.
        </p>

        <div class="border-t border-moss/10">
          <NuxtLink
            to="/app/coffees/new"
            class="block w-full text-left px-md py-sm font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:bg-surface-2 transition-colors duration-150 ease-sorbo"
            @click="collapse"
          >
            + Agregar café nuevo
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
