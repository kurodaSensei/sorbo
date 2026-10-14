<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DEFAULT_VARIETIES } from '~/utils/constants'
import { catalogItems } from '~/utils/catalogs'

const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const items = computed(() => catalogItems(DEFAULT_VARIETIES, settings.prefs?.customVarieties))
</script>

<template>
  <SettingsCatalogList
    title="Variedades"
    add-label="Añadir variedad"
    placeholder="Caturra, Gesha…"
    :items="items"
    :disabled="settings.prefs?.disabledVarieties ?? []"
    @add="settings.addVariety($event)"
    @toggle="settings.toggleDefaultVariety($event)"
  />
</template>
