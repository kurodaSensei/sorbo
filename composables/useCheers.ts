import { deleteField, doc, updateDoc } from 'firebase/firestore'
import type { Tasting } from '~/types'

/**
 * Brindar por la nota de otra persona. Cada brindis es una entrada
 * `cheers.<uid> = true` en el documento; firestore.rules solo deja a un
 * lector cambiar su propia entrada y ningún otro campo.
 */
export const useCheers = () => {
  const { $db } = useNuxtApp()
  const { userId } = useAuth()
  const toast = useToast()

  function hasCheered(t: Tasting): boolean {
    return !!userId.value && !!t.cheers?.[userId.value]
  }

  function cheerCount(t: Tasting): number {
    return Object.keys(t.cheers ?? {}).length
  }

  /** Devuelve la nota con el brindis aplicado (actualización optimista). */
  async function toggle(t: Tasting): Promise<Tasting> {
    const uid = userId.value
    if (!uid) return t
    const on = !hasCheered(t)
    const cheers = { ...(t.cheers ?? {}) }
    if (on) cheers[uid] = true
    else delete cheers[uid]
    try {
      await updateDoc(doc($db, 'tastings', t.id), { [`cheers.${uid}`]: on ? true : deleteField() })
      return { ...t, cheers }
    }
    catch (e) {
      toast.error('No se pudo brindar', e)
      return t
    }
  }

  return { hasCheered, cheerCount, toggle }
}
