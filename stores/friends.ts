import { defineStore } from 'pinia'
import type { Friendship } from '~/types'

export const useFriendsStore = defineStore('friends', () => {
  const { listForUser, sendRequest, acceptRequest, rejectOrRemove, friendshipId } = useFriends()
  const { findByEmail } = useUsers()

  const list = ref<Friendship[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const { userId, currentUser } = useAuth()
    if (!userId.value) return
    loading.value = true
    error.value = null
    try {
      list.value = await listForUser(userId.value)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const accepted = computed(() => list.value.filter(f => f.status === 'accepted'))
  const pendingIncoming = computed(() => {
    const { userId } = useAuth()
    return list.value.filter(f => f.status === 'pending' && f.initiatedBy !== userId.value)
  })
  const pendingOutgoing = computed(() => {
    const { userId } = useAuth()
    return list.value.filter(f => f.status === 'pending' && f.initiatedBy === userId.value)
  })

  // Friend UIDs (other user's uid in each accepted friendship)
  const friendUids = computed(() => {
    const { userId } = useAuth()
    return accepted.value.map(f => f.uids.find(u => u !== userId.value)).filter(Boolean) as string[]
  })

  function getOtherUser(friendship: Friendship) {
    const { userId } = useAuth()
    return friendship.users.find(u => u.uid !== userId.value)
  }

  async function addFriendByEmail(email: string): Promise<{ success: boolean; message: string }> {
    const { userId, currentUser } = useAuth()
    if (!userId.value || !currentUser.value) {
      return { success: false, message: 'No hay sesión activa' }
    }
    const normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail === currentUser.value.email?.toLowerCase()) {
      return { success: false, message: 'No puedes agregarte a ti mismo' }
    }
    const target = await findByEmail(normalizedEmail)
    if (!target) {
      return { success: false, message: 'Usuario no encontrado. Debe tener una cuenta en Coffee Tracker.' }
    }
    const id = friendshipId(userId.value, target.id)
    if (list.value.some(f => f.id === id)) {
      return { success: false, message: 'Ya existe una solicitud o amistad con este usuario' }
    }
    try {
      await sendRequest(
        {
          uid: userId.value,
          email: currentUser.value.email!,
          displayName: currentUser.value.displayName || undefined,
        },
        {
          uid: target.id,
          email: target.email,
          displayName: target.displayName,
        },
      )
      await load()
      return { success: true, message: 'Solicitud enviada' }
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al enviar solicitud' }
    }
  }

  async function accept(id: string) {
    await acceptRequest(id)
    await load()
  }

  async function reject(id: string) {
    await rejectOrRemove(id)
    await load()
  }

  async function remove(id: string) {
    await rejectOrRemove(id)
    await load()
  }

  function reset() {
    list.value = []
    loading.value = false
    error.value = null
  }

  return {
    reset,
    list,
    loading,
    error,
    accepted,
    pendingIncoming,
    pendingOutgoing,
    friendUids,
    getOtherUser,
    load,
    addFriendByEmail,
    accept,
    reject,
    remove,
  }
})
