<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DEFAULT_BREW_METHOD_OPTIONS } from '~/utils/constants'
import { catalogItems } from '~/utils/catalogs'

const settings = useSettingsStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
})

const items = computed(() => catalogItems(DEFAULT_BREW_METHOD_OPTIONS, settings.prefs?.customBrewMethods))
</script>

<template>
  <SettingsCatalogList
    title="Métodos"
    add-label="Añadir método"
    placeholder="V60, AeroPress…"
    :items="items"
    :disabled="settings.prefs?.disabledBrewMethods ?? []"
    @add="settings.addBrewMethod($event)"
    @toggle="settings.toggleDefaultBrewMethod($event)"
  />
</template>
