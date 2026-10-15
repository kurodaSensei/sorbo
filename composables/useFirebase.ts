import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import type { Visibility } from '~/types'

export const useFirebase = () => {
  const { $db } = useNuxtApp()
  const { userId } = useAuth()

  const getAll = async <T>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
  ): Promise<T[]> => {
    if (!userId.value) return []
    const userConstraint = where('userId', '==', userId.value)
    const q = query(collection($db, collectionName), userConstraint, ...constraints)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as T[]
  }

  const getById = async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc($db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      // Puede leer: dueño, incluido en sharedWith, o item de comunidad.
      const isOwner = data.userId === userId.value
      const isShared = Array.isArray(data.sharedWith) && data.sharedWith.includes(userId.value)
      const isCommunity = data.visibility === 'community'
      if (!isOwner && !isShared && !isCommunity) return null
      return { id: docSnap.id, ...data } as T
    }
    return null
  }

  // Fetch items shared with the current user (across a collection)
  const getSharedWithMe = async <T>(collectionName: string): Promise<T[]> => {
    if (!userId.value) return []
    try {
      const q = query(
        collection($db, collectionName),
        where('sharedWith', 'array-contains', userId.value),
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[]
    } catch (e: any) {
      console.error(`[getSharedWithMe] ${collectionName} failed:`, e)
      throw e
    }
  }

  interface VisibilityPayload {
    visibility: Visibility
    /** UIDs con los que se comparte cuando visibility === 'friends'. */
    sharedWith: string[]
    /** Nombre/avatar del autor, denormalizados al pasar a 'community'. */
    authorName?: string
    authorPhotoURL?: string
  }

  const updateVisibility = async (
    collectionName: string,
    id: string,
    payload: VisibilityPayload,
  ): Promise<void> => {
    if (!userId.value) throw new Error('No authenticated user')
    const docRef = doc($db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists() || docSnap.data().userId !== userId.value) {
      throw new Error('Unauthorized')
    }
    const data: DocumentData = {
      visibility: payload.visibility,
      // sharedWith solo tiene sentido en 'friends'; se limpia en otros casos.
      sharedWith: payload.visibility === 'friends' ? payload.sharedWith : [],
      updatedAt: Timestamp.now(),
    }
    if (payload.visibility === 'community') {
      data.authorName = payload.authorName ?? null
      data.authorPhotoURL = payload.authorPhotoURL ?? null
    }
    await updateDoc(docRef, data)
  }

  /**
   * Trae items marcados como 'community' de una colección, más recientes
   * primero. Requiere un índice compuesto (visibility ASC, createdAt DESC).
   */
  const getCommunityFeed = async <T>(
    collectionName: string,
    max = 40,
  ): Promise<T[]> => {
    if (!userId.value) return []
    const q = query(
      collection($db, collectionName),
      where('visibility', '==', 'community'),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[]
  }

  const create = async <T extends DocumentData>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  ): Promise<string> => {
    if (!userId.value) throw new Error('No authenticated user')
    const docRef = await addDoc(collection($db, collectionName), {
      ...data,
      userId: userId.value,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  }

  const update = async <T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>,
  ): Promise<void> => {
    if (!userId.value) throw new Error('No authenticated user')
    const docRef = doc($db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists() || docSnap.data().userId !== userId.value) {
      throw new Error('Unauthorized: document not found or access denied')
    }
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  }

  const remove = async (collectionName: string, id: string): Promise<void> => {
    if (!userId.value) throw new Error('No authenticated user')
    const docRef = doc($db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists() || docSnap.data().userId !== userId.value) {
      throw new Error('Unauthorized: document not found or access denied')
    }
    await deleteDoc(docRef)
  }

  return {
    getAll,
    getById,
    getSharedWithMe,
    updateVisibility,
    getCommunityFeed,
    create,
    update,
    remove,
    collection,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
  }
}
