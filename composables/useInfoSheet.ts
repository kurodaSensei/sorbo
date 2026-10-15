export interface InfoSheetContent {
  title: string
  /** Qué es el concepto. */
  body: string
  /** Opcional: cómo notarlo en la práctica. */
  howTo?: string
}

const currentInfo = ref<InfoSheetContent | null>(null)

/**
 * Hoja con explicación de un concepto. Pensada para que el usuario casual
 * pueda entender términos de cata (acidez, cuerpo, retrogusto, etc) sin
 * salir del flujo. El componente UiInfoSheet vive en app.vue y observa
 * este ref module-level.
 */
export const useInfoSheet = () => {
  function showInfo(content: InfoSheetContent) {
    currentInfo.value = content
  }

  function closeInfo() {
    currentInfo.value = null
  }

  return {
    currentInfo: readonly(currentInfo),
    showInfo,
    closeInfo,
  }
}
