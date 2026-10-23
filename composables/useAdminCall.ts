import { onMounted, ref } from 'vue'

/** Trae los datos de una función del panel admin al montar la página. A quien no es admin lo devuelve a la app. */
export function useAdminCall<T>(name: 'adminPulse' | 'adminUsers' | 'adminHealth') {
  const { $firebase } = useNuxtApp()
  const data = ref<T | null>(null)
  const error = ref('')

  async function load() {
    error.value = ''
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      data.value = (await httpsCallable<void, T>(getFunctions($firebase, 'us-central1'), name)()).data
    }
    catch (e) {
      // La función decide quién es admin (ADMIN_EMAILS).
      if ((e as { code?: string }).code === 'functions/permission-denied') return navigateTo('/app', { replace: true })
      error.value = e instanceof Error ? e.message : String(e)
    }
  }
  onMounted(load)

  return { data, error, load }
}
