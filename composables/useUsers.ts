import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore'
import type { UserProfile } from '~/types'

export const useUsers = () => {
  const { $db } = useNuxtApp()

  const upsertProfile = async (profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>) => {
    const ref = doc($db, 'users', profile.id)
    const snap = await getDoc(ref)
    await setDoc(ref, {
      ...profile,
      updatedAt: Timestamp.now(),
      createdAt: snap.exists() ? snap.data().createdAt : Timestamp.now(),
    }, { merge: true })
  }

  const findByEmail = async (email: string): Promise<UserProfile | null> => {
    const q = query(collection($db, 'users'), where('email', '==', email.toLowerCase().trim()), limit(1))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as UserProfile
  }

  const getById = async (uid: string): Promise<UserProfile | null> => {
    const ref = doc($db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as UserProfile
  }

  return { upsertProfile, findByEmail, getById }
}
