import type { Ref, ComputedRef } from 'vue'

/**
 * Generic CRUD pipeline + state exposed by every app store.
 */
export interface FirestoreCollectionApi<T, TCreateInput = any, TFilters = any> {
  fetchAll: (filters?: TFilters) => Promise<T[]>
  fetchById: (id: string) => Promise<T | null>
  create: (data: TCreateInput) => Promise<string>
  update: (id: string, data: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Optional: fetch items shared with me */
  fetchShared?: () => Promise<T[]>
}

export interface FirestoreStoreMessages {
  /** e.g. 'Café creado' */
  created: string
  /** e.g. 'Café actualizado' */
  updated: string
  /** e.g. 'Café eliminado' */
  removed: string
  /** e.g. 'No se pudo crear el café' */
  createFailed: string
  updateFailed: string
  removeFailed: string
  /** e.g. 'No se pudieron cargar cafés compartidos' */
  sharedLoadFailed?: string
}

export interface FirestoreStoreOptions<T extends { id: string }, TCreate = any, TFilters = any> {
  api: FirestoreCollectionApi<T, TCreate, TFilters>
  messages: FirestoreStoreMessages
  /** Optional sort for sharedList */
  sortShared?: (items: T[]) => T[]
}

/**
 * Creates the shared reactive state + generic CRUD actions used by all
 * app Pinia stores. Pair with Pinia's `defineStore(id, () => { ... })` in
 * each concrete store file — that way the concrete store still owns its
 * identity and can extend the base with domain-specific methods.
 */
export function useFirestoreStoreState<
  T extends { id: string },
  TCreate = any,
  TFilters = any,
>(options: FirestoreStoreOptions<T, TCreate, TFilters>) {
  const list = ref<T[]>([]) as Ref<T[]>
  const sharedList = ref<T[]>([]) as Ref<T[]>
  const current = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAll(filters?: TFilters) {
    loading.value = true
    error.value = null
    try {
      list.value = await options.api.fetchAll(filters)
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load'
    } finally {
      loading.value = false
    }
  }

  async function loadShared() {
    if (!options.api.fetchShared) return
    try {
      const items = await options.api.fetchShared()
      sharedList.value = options.sortShared ? options.sortShared(items) : items
    } catch (e: any) {
      console.error('Failed to load shared:', e)
      if (options.messages.sharedLoadFailed) {
        const toast = useToast()
        toast.error(options.messages.sharedLoadFailed, e)
      }
    }
  }

  async function loadById(id: string) {
    loading.value = true
    error.value = null
    try {
      current.value = await options.api.fetchById(id)
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load'
    } finally {
      loading.value = false
    }
  }

  async function create(data: TCreate) {
    const toast = useToast()
    loading.value = true
    error.value = null
    try {
      const id = await options.api.create(data)
      await loadAll()
      toast.success(options.messages.created)
      return id
    } catch (e: any) {
      error.value = e.message ?? 'Failed'
      toast.error(options.messages.createFailed, e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id: string, data: Partial<T>) {
    const toast = useToast()
    loading.value = true
    error.value = null
    try {
      await options.api.update(id, data)
      await loadAll()
      if (current.value?.id === id) {
        current.value = await options.api.fetchById(id)
      }
      toast.success(options.messages.updated)
    } catch (e: any) {
      error.value = e.message ?? 'Failed'
      toast.error(options.messages.updateFailed, e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(id: string) {
    const toast = useToast()
    loading.value = true
    error.value = null
    try {
      await options.api.remove(id)
      list.value = list.value.filter(item => item.id !== id)
      if (current.value?.id === id) current.value = null
      toast.success(options.messages.removed)
    } catch (e: any) {
      error.value = e.message ?? 'Failed'
      toast.error(options.messages.removeFailed, e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function reset() {
    list.value = []
    sharedList.value = []
    current.value = null
    loading.value = false
    error.value = null
  }

  return {
    // state
    list,
    sharedList,
    current,
    loading,
    error,
    // actions
    loadAll,
    loadShared,
    loadById,
    create,
    update,
    remove,
    reset,
  }
}
