<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DEFAULT_FLAVOR_NOTES } from '~/utils/constants'
import { catalogItems } from '~/utils/catalogs'

// Sabores: lo que reconoces en la taza (en v1 se llamaban «notas»).
const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const items = computed(() => catalogItems(DEFAULT_FLAVOR_NOTES, settings.prefs?.customFlavorNotes))
</script>

<template>
  <SettingsCatalogList
    title="Sabores"
    add-label="Añadir sabor"
    placeholder="Mandarina, panela…"
    :items="items"
    :disabled="settings.prefs?.disabledFlavorNotes ?? []"
    @add="settings.addFlavorNote($event)"
    @toggle="settings.toggleDefaultFlavorNote($event)"
  />
</template>
