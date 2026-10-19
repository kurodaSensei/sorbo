import type { Coffee } from '~/types'

export const useCoffees = () => {
  const { getAll, getById, create, update, remove } = useFirebase()
  const COLLECTION = 'coffees'

  const fetchAll = async (filters?: {
    roasterId?: string
    process?: string
    variety?: string
  }): Promise<Coffee[]> => {
    const all = await getAll<Coffee>(COLLECTION)
    let result = all
    if (filters?.roasterId) result = result.filter(c => c.roasterId === filters.roasterId)
    if (filters?.process) result = result.filter(c => c.process === filters.process)
    if (filters?.variety) result = result.filter(c => coffeeVarieties(c).includes(filters.variety!))
    return result.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
  }

  const fetchById = async (id: string): Promise<Coffee | null> => {
    return getById<Coffee>(COLLECTION, id)
  }

  const createCoffee = async (data: Omit<Coffee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    return create(COLLECTION, data)
  }

  const updateCoffee = async (id: string, data: Partial<Coffee>): Promise<void> => {
    return update(COLLECTION, id, data)
  }

  const deleteCoffee = async (id: string): Promise<void> => {
    return remove(COLLECTION, id)
  }

  return {
    fetchAll,
    fetchById,
    createCoffee,
    updateCoffee,
    deleteCoffee,
  }
}
