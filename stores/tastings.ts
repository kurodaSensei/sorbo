import { defineStore } from 'pinia'
import type { Tasting, TastingInput, BrewMethod, Visibility } from '~/types'

const VISIBILITY_TOAST: Record<Visibility, string> = {
  private: 'Ahora es privada',
  friends: 'Compartida con amigos',
  community: 'Compartida con la comunidad',
}

interface TastingFilters {
  coffeeId?: string
  brewMethod?: BrewMethod
  isFavorite?: boolean
}

export const useTastingsStore = defineStore('tastings', () => {
  const { fetchAll, fetchRecent, fetchById, createTasting, updateTasting, deleteTasting } = useTastings()
  const { getSharedWithMe, updateVisibility: updateVisibilityDoc } = useFirebase()

  const base = useFirestoreStoreState<Tasting, TastingInput, TastingFilters>({
    api: {
      fetchAll,
      fetchById,
      create: createTasting,
      update: updateTasting,
      remove: deleteTasting,
      fetchShared: () => getSharedWithMe<Tasting>('tastings'),
    },
    messages: {
      created: 'Cata registrada',
      updated: 'Cata actualizada',
      removed: 'Cata eliminada',
      createFailed: 'No se pudo crear la cata',
      updateFailed: 'No se pudo actualizar la cata',
      removeFailed: 'No se pudo eliminar la cata',
      sharedLoadFailed: 'No se pudieron cargar catas compartidas',
    },
    sortShared: items => items.sort((a, b) => {
      const ta = a.brewDate?.toMillis?.() ?? 0
      const tb = b.brewDate?.toMillis?.() ?? 0
      return tb - ta
    }),
  })

  // Domain-specific: recent tastings list
  const recent = ref<Tasting[]>([])

  async function loadRecent(count: number = 5) {
    try {
      recent.value = await fetchRecent(count)
    } catch (e: any) {
      base.error.value = e.message ?? 'Failed to load recent tastings'
    }
  }

  async function updateVisibility(id: string, visibility: Visibility, sharedWith: string[] = []) {
    const toast = useToast()
    const { currentUser } = useAuth()
    try {
      await updateVisibilityDoc('tastings', id, {
        visibility,
        sharedWith,
        authorName: currentUser.value?.displayName
          || currentUser.value?.email?.split('@')[0]
          || undefined,
        authorPhotoURL: currentUser.value?.photoURL || undefined,
      })
      const patch = {
        visibility,
        sharedWith: visibility === 'friends' ? sharedWith : [],
      }
      if (base.current.value?.id === id) {
        base.current.value = { ...base.current.value, ...patch } as Tasting
      }
      const idx = base.list.value.findIndex(t => t.id === id)
      if (idx !== -1) {
        base.list.value[idx] = { ...base.list.value[idx], ...patch } as Tasting
      }
      toast.success(VISIBILITY_TOAST[visibility])
    } catch (e: any) {
      toast.error('No se pudo actualizar la visibilidad', e)
      throw e
    }
  }

  const originalReset = base.reset
  function reset() {
    recent.value = []
    originalReset()
  }

  return {
    ...base,
    recent,
    loadRecent,
    updateVisibility,
    reset,
  }
})
