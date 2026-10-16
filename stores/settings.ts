import { defineStore } from 'pinia'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import type { UserPreferences } from '~/types'

const DEFAULT_PREFS: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  customVarieties: [],
  customProcesses: [],
  customBrewMethods: [],
  customFlavorNotes: [],
  disabledVarieties: [],
  disabledProcesses: [],
  disabledBrewMethods: [],
  disabledFlavorNotes: [],
  hasSeenWelcome: false,
  hideOnboardingChecklist: false,
}

export const useSettingsStore = defineStore('settings', () => {
  const prefs = ref<UserPreferences | null>(null)
  const loading = ref(false)

  async function load() {
    // Idempotente: si ya está cargado o cargándose, no dispara otra lectura.
    // Deja que otros consumidores esperen el mismo prefs.value reactivo.
    if (prefs.value || loading.value) return
    const { $db } = useNuxtApp()
    const { userId } = useAuth()
    if (!userId.value) return

    loading.value = true
    try {
      const ref = doc($db, 'userPreferences', userId.value)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        // Merge con DEFAULT_PREFS para que campos nuevos (p.ej. flavor notes
        // añadidos en versiones posteriores) no queden como undefined cuando
        // se lean documentos antiguos.
        prefs.value = {
          id: snap.id,
          ...DEFAULT_PREFS,
          ...snap.data(),
        } as UserPreferences
      } else {
        prefs.value = {
          id: userId.value,
          userId: userId.value,
          ...DEFAULT_PREFS,
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function save() {
    const { $db } = useNuxtApp()
    const { userId } = useAuth()
    if (!userId.value || !prefs.value) return

    const ref = doc($db, 'userPreferences', userId.value)
    await setDoc(ref, {
      userId: userId.value,
      customVarieties: prefs.value.customVarieties,
      customProcesses: prefs.value.customProcesses,
      customBrewMethods: prefs.value.customBrewMethods,
      customFlavorNotes: prefs.value.customFlavorNotes,
      disabledVarieties: prefs.value.disabledVarieties,
      disabledProcesses: prefs.value.disabledProcesses,
      disabledBrewMethods: prefs.value.disabledBrewMethods,
      disabledFlavorNotes: prefs.value.disabledFlavorNotes,
      hasSeenWelcome: prefs.value.hasSeenWelcome ?? false,
      hideOnboardingChecklist: prefs.value.hideOnboardingChecklist ?? false,
      updatedAt: Timestamp.now(),
      createdAt: prefs.value.createdAt || Timestamp.now(),
    }, { merge: true })
  }

  async function markWelcomeSeen() {
    if (!prefs.value) return
    if (prefs.value.hasSeenWelcome) return
    prefs.value.hasSeenWelcome = true
    await save()
  }

  async function restoreOnboardingChecklist() {
    if (!prefs.value || !prefs.value.hideOnboardingChecklist) return
    prefs.value.hideOnboardingChecklist = false
    await save()
  }

  async function dismissOnboardingChecklist() {
    if (!prefs.value) return
    if (prefs.value.hideOnboardingChecklist) return
    prefs.value.hideOnboardingChecklist = true
    await save()
  }

  async function addVariety(name: string) {
    if (!prefs.value || !name.trim()) return
    const v = name.trim()
    if (!prefs.value.customVarieties.includes(v)) {
      prefs.value.customVarieties.push(v)
      await save()
    }
  }

  async function removeCustomVariety(name: string) {
    if (!prefs.value) return
    prefs.value.customVarieties = prefs.value.customVarieties.filter(v => v !== name)
    await save()
  }

  async function toggleDefaultVariety(name: string) {
    if (!prefs.value) return
    if (prefs.value.disabledVarieties.includes(name)) {
      prefs.value.disabledVarieties = prefs.value.disabledVarieties.filter(v => v !== name)
    } else {
      prefs.value.disabledVarieties.push(name)
    }
    await save()
  }

  async function addProcess(label: string) {
    if (!prefs.value || !label.trim()) return
    const value = `custom_${label.trim().toLowerCase().replace(/\s+/g, '_')}`
    if (!prefs.value.customProcesses.some(p => p.value === value)) {
      prefs.value.customProcesses.push({ value, label: label.trim() })
      await save()
    }
  }

  async function removeCustomProcess(value: string) {
    if (!prefs.value) return
    prefs.value.customProcesses = prefs.value.customProcesses.filter(p => p.value !== value)
    await save()
  }

  async function toggleDefaultProcess(value: string) {
    if (!prefs.value) return
    if (prefs.value.disabledProcesses.includes(value)) {
      prefs.value.disabledProcesses = prefs.value.disabledProcesses.filter(v => v !== value)
    } else {
      prefs.value.disabledProcesses.push(value)
    }
    await save()
  }

  async function addBrewMethod(label: string) {
    if (!prefs.value || !label.trim()) return
    const value = `custom_${label.trim().toLowerCase().replace(/\s+/g, '_')}`
    if (!prefs.value.customBrewMethods.some(m => m.value === value)) {
      prefs.value.customBrewMethods.push({ value, label: label.trim() })
      await save()
    }
  }

  async function removeCustomBrewMethod(value: string) {
    if (!prefs.value) return
    prefs.value.customBrewMethods = prefs.value.customBrewMethods.filter(m => m.value !== value)
    await save()
  }

  async function toggleDefaultBrewMethod(value: string) {
    if (!prefs.value) return
    if (prefs.value.disabledBrewMethods.includes(value)) {
      prefs.value.disabledBrewMethods = prefs.value.disabledBrewMethods.filter(v => v !== value)
    } else {
      prefs.value.disabledBrewMethods.push(value)
    }
    await save()
  }

  async function addFlavorNote(name: string) {
    if (!prefs.value || !name.trim()) return
    const v = name.trim()
    if (!prefs.value.customFlavorNotes.includes(v)) {
      prefs.value.customFlavorNotes.push(v)
      await save()
    }
  }

  async function removeCustomFlavorNote(name: string) {
    if (!prefs.value) return
    prefs.value.customFlavorNotes = prefs.value.customFlavorNotes.filter(v => v !== name)
    await save()
  }

  async function toggleDefaultFlavorNote(name: string) {
    if (!prefs.value) return
    if (prefs.value.disabledFlavorNotes.includes(name)) {
      prefs.value.disabledFlavorNotes = prefs.value.disabledFlavorNotes.filter(v => v !== name)
    } else {
      prefs.value.disabledFlavorNotes.push(name)
    }
    await save()
  }

  function reset() {
    prefs.value = null
    loading.value = false
  }

  return {
    reset,
    prefs,
    loading,
    load,
    save,
    addVariety,
    removeCustomVariety,
    toggleDefaultVariety,
    addProcess,
    removeCustomProcess,
    toggleDefaultProcess,
    addBrewMethod,
    removeCustomBrewMethod,
    toggleDefaultBrewMethod,
    addFlavorNote,
    removeCustomFlavorNote,
    toggleDefaultFlavorNote,
    markWelcomeSeen,
    dismissOnboardingChecklist,
    restoreOnboardingChecklist,
  }
})
