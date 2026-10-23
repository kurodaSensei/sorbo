import { describe, it, expect } from 'vitest'
import { maskEmail, people } from '../../functions/src/people'

const at = (day: number) => new Date(Date.UTC(2026, 9, day, 15))

describe('admin · usuarios', () => {
  const list = people({
    users: [
      { uid: 'a', name: 'Julián Gómez', email: 'julian@gmail.com', createdAt: at(1) },
      { uid: 'b', name: null, email: null, createdAt: at(20) },
      { uid: 'c', name: 'Mateo', email: 'mateo@icloud.com', createdAt: at(2) },
    ],
    coffees: [{ userId: 'a', createdAt: at(5) }, { userId: 'c', createdAt: at(3) }],
    tastings: [{ userId: 'a', createdAt: at(18) }, { userId: 'a', createdAt: at(10) }, { userId: null, createdAt: at(19) }],
    recipes: [{ userId: 'a', createdAt: null }],
    friendships: [['a', 'c']],
    reminders: new Map([['a', 'morning' as const]]),
  })

  it('conteos por persona, sin contenido', () => {
    expect(list.find(p => p.uid === 'a')).toMatchObject({
      name: 'Julián G.', email: 'j•••@gmail.com', coffees: 1, notes: 2, recipes: 1, friends: 1,
      lastAt: at(18).toISOString(), reminder: 'morning',
    })
    expect(list.find(p => p.uid === 'b')).toMatchObject({ name: 'Sin nombre', email: 'Sin correo', notes: 0, lastAt: null, reminder: null })
  })

  it('lo más reciente arriba; sin actividad cuenta la fecha de alta', () => {
    expect(list.map(p => p.uid)).toEqual(['b', 'a', 'c'])
  })

  it('busca por correo completo aunque se muestre enmascarado', () => {
    expect(list.find(p => p.uid === 'c')!.search).toContain('mateo@icloud.com')
    expect(maskEmail('x')).toBe('Sin correo')
  })
})
