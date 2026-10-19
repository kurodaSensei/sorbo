import { defineStore } from 'pinia'
import type { Coffee, WishlistItem, WishlistInput, WishlistStatus } from '~/types'

export const useWishlistStore = defineStore('wishlist', () => {
  const { fetchAll, fetchById, createItem, updateItem, deleteItem } = useWishlist()

  const base = useFirestoreStoreState<WishlistItem, WishlistInput>({
    api: {
      fetchAll,
      fetchById,
      create: createItem,
      update: updateItem,
      remove: deleteItem,
    },
    messages: {
      created: 'Agregado a wishlist',
      updated: 'Wishlist actualizada',
      removed: 'Eliminado de wishlist',
      createFailed: 'No se pudo crear el item de wishlist',
      updateFailed: 'No se pudo actualizar el item de wishlist',
      removeFailed: 'No se pudo eliminar el item de wishlist',
    },
  })

  // Domain-specific: change status only
  async function changeStatus(id: string, status: WishlistStatus) {
    const toast = useToast()
    base.loading.value = true
    base.error.value = null
    try {
      await updateItem(id, { status })
      await base.loadAll()
      if (base.current.value?.id === id) {
        base.current.value = await fetchById(id)
      }
      toast.success('Estado actualizado')
    } catch (e: any) {
      base.error.value = e.message ?? 'Failed'
      toast.error('No se pudo actualizar el estado', e)
      throw e
    } finally {
      base.loading.value = false
    }
  }

  // Helpers para guardar desde Explora ─────────────────────────────────────

  function normalize(s?: string): string {
    return (s || '').trim().toLowerCase()
  }

  /** Busca un item ya guardado que coincida con el café (nombre + marca). */
  function findMatchingItem(coffee: Coffee): WishlistItem | null {
    const name = normalize(coffee.name)
    const roaster = normalize(coffee.roasterName)
    return (base.list.value as WishlistItem[]).find(item =>
      normalize(item.coffeeName) === name
      && normalize(item.roasterName) === roaster,
    ) ?? null
  }

  /**
   * Añade un café de la comunidad a la wishlist. Si ya estaba (mismo nombre
   * y marca) avisa con un toast y no duplica.
   */
  async function addFromCoffee(coffee: Coffee): Promise<{ added: boolean }> {
    const toast = useToast()
    const existing = findMatchingItem(coffee)
    if (existing) {
      toast.info('Ya está en tu wishlist')
      return { added: false }
    }
    const payload: WishlistInput = {
      coffeeName: coffee.name,
      roasterId: coffee.roasterId || undefined,
      roasterName: coffee.roasterName || undefined,
      variety: coffeeVarieties(coffee).join(' · ') || undefined,
      priority: 3,
      status: 'pending',
    }
    await base.create(payload)
    return { added: true }
  }

  return {
    ...base,
    changeStatus,
    findMatchingItem,
    addFromCoffee,
  }
})
