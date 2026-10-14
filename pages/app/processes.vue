<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DEFAULT_PROCESS_OPTIONS } from '~/utils/constants'
import { catalogItems } from '~/utils/catalogs'

const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const items = computed(() => catalogItems(DEFAULT_PROCESS_OPTIONS, settings.prefs?.customProcesses))
</script>

<template>
  <SettingsCatalogList
    title="Procesos"
    add-label="Añadir proceso"
    placeholder="Lavado, Natural…"
    :items="items"
    :disabled="settings.prefs?.disabledProcesses ?? []"
    @add="settings.addProcess($event)"
    @toggle="settings.toggleDefaultProcess($event)"
  />
</template>
