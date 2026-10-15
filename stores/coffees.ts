import { defineStore } from 'pinia'
import type { Coffee, CoffeeInput, CoffeeProcess, Visibility } from '~/types'

const VISIBILITY_TOAST: Record<Visibility, string> = {
  private: 'Ahora es privado',
  friends: 'Compartido con amigos',
  community: 'Compartido con la comunidad',
}

interface CoffeeFilters {
  roasterId?: string
  process?: CoffeeProcess
  variety?: string
}

export const useCoffeesStore = defineStore('coffees', () => {
  const { fetchAll, fetchById, createCoffee, updateCoffee, deleteCoffee } = useCoffees()
  const { getSharedWithMe, updateVisibility: updateVisibilityDoc } = useFirebase()

  const base = useFirestoreStoreState<Coffee, CoffeeInput, CoffeeFilters>({
    api: {
      fetchAll,
      fetchById,
      create: createCoffee,
      update: updateCoffee,
      remove: deleteCoffee,
      fetchShared: () => getSharedWithMe<Coffee>('coffees'),
    },
    messages: {
      created: 'Café creado',
      updated: 'Café actualizado',
      removed: 'Café eliminado',
      createFailed: 'No se pudo crear el café',
      updateFailed: 'No se pudo actualizar el café',
      removeFailed: 'No se pudo eliminar el café',
      sharedLoadFailed: 'No se pudieron cargar cafés compartidos',
    },
    sortShared: items => items.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    }),
  })

  // Domain-specific: persisted filters
  const filters = ref<CoffeeFilters>({})

  const originalLoadAll = base.loadAll
  async function loadAll(newFilters?: CoffeeFilters) {
    if (newFilters) filters.value = newFilters
    return originalLoadAll(filters.value)
  }

  function clearFilters() {
    filters.value = {}
  }

  async function updateVisibility(id: string, visibility: Visibility, sharedWith: string[] = []) {
    const toast = useToast()
    const { currentUser } = useAuth()
    try {
      await updateVisibilityDoc('coffees', id, {
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
        base.current.value = { ...base.current.value, ...patch } as Coffee
      }
      const idx = base.list.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        base.list.value[idx] = { ...base.list.value[idx], ...patch } as Coffee
      }
      toast.success(VISIBILITY_TOAST[visibility])
    } catch (e: any) {
      toast.error('No se pudo actualizar la visibilidad', e)
      throw e
    }
  }

  /**
   * Duplica un café de la comunidad a la colección del usuario actual.
   * El nuevo doc nace privado, sin denormalización de autor ni sharedWith.
   * Se omite photoUrl y roastDate (son del autor original, no del duplicado).
   */
  async function duplicate(source: Coffee): Promise<string | null> {
    const toast = useToast()
    try {
      const payload: CoffeeInput = {
        name: source.name,
        roasterId: source.roasterId,
        roasterName: source.roasterName,
        variety: source.variety,
        process: source.process,
        originRegion: source.originRegion,
        originCountry: source.originCountry,
        originFarm: source.originFarm,
        originProducer: source.originProducer,
        altitude: source.altitude,
        scaScore: source.scaScore,
        roastLevel: source.roastLevel,
        price: source.price,
        weight: source.weight,
        flavorNotes: [...(source.flavorNotes || [])],
        purchaseChannel: source.purchaseChannel,
        purchaseReference: source.purchaseReference,
      } as CoffeeInput
      const id = await createCoffee(payload)
      await base.loadAll()
      toast.success('Añadido a tu colección')
      return id
    } catch (e: any) {
      toast.error('No se pudo añadir a tu colección', e)
      return null
    }
  }

  const originalReset = base.reset
  function reset() {
    filters.value = {}
    originalReset()
  }

  return {
    ...base,
    filters,
    loadAll,
    clearFilters,
    updateVisibility,
    duplicate,
    reset,
  }
})
