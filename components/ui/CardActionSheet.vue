<script setup lang="ts">
/**
 * Sheet de acciones para una card de lista (café, cata, receta).
 * Se abre desde long-press en mobile o desde un botón explícito.
 *
 * Las acciones disponibles son las 3 estándar:
 *   - Compartir → emit('share')
 *   - Editar    → emit('edit')
 *   - Eliminar  → emit('delete') — destructive
 *
 * El sheet usa el patrón BottomSheet ya existente — slide-up mobile,
 * modal centrado desktop, drag-to-close, etc.
 */

defineProps<{
  modelValue: boolean
  /** Título del sheet, típicamente el nombre de la entidad. */
  title: string
  /** Subtitle opcional (ej. "Cata" o "Receta"). */
  subtitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  share: []
  edit: []
  delete: []
}>()

function close() {
  emit('update:modelValue', false)
}

function onShare() {
  emit('share')
  close()
}

function onEdit() {
  emit('edit')
  close()
}

function onDelete() {
  emit('delete')
  close()
}
</script>

<template>
  <UiBottomSheet
    :model-value="modelValue"
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p
      v-if="subtitle"
      class="font-display italic text-[13px] text-moss-soft -mt-xs"
    >
      {{ subtitle }}
    </p>

    <div class="mt-md flex flex-col">
      <button
        type="button"
        class="flex items-center gap-md py-md border-b border-moss/10 transition-colors hover:bg-surface-2/40 text-left"
        @click="onShare"
      >
        <Icon name="lucide:share-2" class="size-[18px] text-moss-soft shrink-0" />
        <span class="font-sans text-[15px] text-moss">Compartir</span>
      </button>
      <button
        type="button"
        class="flex items-center gap-md py-md border-b border-moss/10 transition-colors hover:bg-surface-2/40 text-left"
        @click="onEdit"
      >
        <Icon name="lucide:pencil" class="size-[18px] text-moss-soft shrink-0" />
        <span class="font-sans text-[15px] text-moss">Editar</span>
      </button>
      <button
        type="button"
        class="flex items-center gap-md py-md transition-colors hover:bg-surface-2/40 text-left"
        @click="onDelete"
      >
        <Icon name="lucide:trash-2" class="size-[18px] text-terracotta shrink-0" />
        <span class="font-sans text-[15px] text-terracotta">Eliminar</span>
      </button>
    </div>
  </UiBottomSheet>
</template>
