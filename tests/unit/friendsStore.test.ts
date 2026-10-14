import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useFriendsStore } from '~/stores/friends'

// Solo quien recibió la solicitud puede aceptarla (initiatedBy distinto de mi uid).
const mk = (id: string, status: string, initiatedBy: string) => ({
  id, status, initiatedBy, uids: ['me', 'x'],
  users: [{ uid: 'me', email: 'me@x.co' }, { uid: 'x', email: 'x@x.co' }],
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('useAuth', () => ({ userId: ref('me'), currentUser: ref({ email: 'me@x.co' }) }))
  vi.stubGlobal('useUsers', () => ({ findByEmail: vi.fn() }))
  vi.stubGlobal('useFriends', () => ({
    listForUser: vi.fn(async () => []), sendRequest: vi.fn(), acceptRequest: vi.fn(), rejectOrRemove: vi.fn(), friendshipId: vi.fn(),
  }))
})

describe('solicitudes de amistad', () => {
  it('solo las recibidas ofrecen aceptar; las enviadas solo cancelar', () => {
    const s = useFriendsStore()
    s.list = [mk('a', 'pending', 'x'), mk('b', 'pending', 'me'), mk('c', 'accepted', 'me')] as any
    expect(s.pendingIncoming.map(f => f.id)).toEqual(['a'])
    expect(s.pendingOutgoing.map(f => f.id)).toEqual(['b'])
    expect(s.accepted.map(f => f.id)).toEqual(['c'])
  })
})
