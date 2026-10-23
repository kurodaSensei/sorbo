import { describe, it, expect } from 'vitest'
import { monthStart, pulse, shortName } from '../../functions/src/pulse'

// Jueves 23 oct 2026, 15:00 UTC (10:00 en Bogotá).
const now = new Date(Date.UTC(2026, 9, 23, 15))
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
const row = (userId: string, days: number) => ({ userId, createdAt: daysAgo(days) })

const users = [
  { uid: 'a', name: 'Laura Martínez', createdAt: daysAgo(1) },
  { uid: 'b', name: 'Andrés', createdAt: daysAgo(10) },
  { uid: 'c', name: null, createdAt: daysAgo(40) },
]

describe('admin · pulso', () => {
  const p = pulse({
    now,
    users,
    coffees: [row('a', 1), row('b', 9), row('c', 40)],
    tastings: [row('b', 2), row('b', 8), row('b', 20), row('c', 40), { userId: null, createdAt: null }],
    recipes: [row('c', 3)],
    friendships: 2,
    waitlist: 7,
  })

  it('ventanas de 7 y 30 días', () => {
    expect(p.week).toEqual({ newUsers: 1, active: 3, notes: 1 })
    expect(p.month).toEqual({ newUsers: 2, active: 3, notes: 3 })
  })

  it('embudo hasta 3 notas', () => {
    expect(p.funnel).toEqual({ registered: 3, firstCoffee: 3, firstNote: 2, threeNotes: 1 })
  })

  it('por mes desde la primera nota, el actual al final', () => {
    // La nota más vieja es de hace 40 días (13 sep): septiembre y octubre.
    expect(p.monthly).toEqual([
      { start: '2026-09-01T05:00:00.000Z', notes: 1 },
      { start: '2026-10-01T05:00:00.000Z', notes: 3 },
    ])
  })

  it('como mucho 12 meses, y el mes actual aunque no haya notas', () => {
    const old = pulse({ now, users: [], coffees: [], tastings: [{ userId: 'a', createdAt: daysAgo(900) }], recipes: [], friendships: 0, waitlist: 0 })
    expect(old.monthly).toHaveLength(12)
    expect(old.monthly[0].start).toBe('2025-11-01T05:00:00.000Z')
    expect(pulse({ now, users: [], coffees: [], tastings: [], recipes: [], friendships: 0, waitlist: 0 }).monthly).toEqual([{ start: '2026-10-01T05:00:00.000Z', notes: 0 }])
  })

  it('recientes primero, sin correo', () => {
    expect(p.recent.map(r => r.name)).toEqual(['Laura M.', 'Andrés', 'Sin nombre'])
    expect(p.recent[1]).toMatchObject({ coffee: true, note: true, three: true })
  })

  it('el mes empieza el día 1 en Bogotá', () => {
    // 1 de noviembre a las 02:00 UTC todavía es 31 de octubre en Bogotá.
    expect(monthStart(new Date(Date.UTC(2026, 10, 1, 2))).toISOString()).toBe('2026-10-01T05:00:00.000Z')
    expect(shortName('  ana  maría  ')).toBe('ana M.')
  })
})
