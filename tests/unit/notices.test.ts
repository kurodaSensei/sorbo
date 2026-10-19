import { describe, expect, it } from 'vitest'
import { buildNotices, timeAgo } from '../../utils/notices'

const NOW = Date.UTC(2026, 9, 19, 15)
const ts = (hoursAgo: number) => ({ toMillis: () => NOW - hoursAgo * 3_600_000 })
const friends = new Map([['laura', 'Laura'], ['camilo', 'Camilo']])
const opts = { friends, seenAt: NOW - 3 * 3_600_000, now: NOW, method: (v: string) => ({ v60: 'V60' } as Record<string, string>)[v] || v }

describe('avisos de amigos', () => {
  it('arma el texto, marca lo nuevo y ordena por fecha', () => {
    const list = buildNotices([
      { kind: 'cafe', via: 'community', item: { id: 'c1', userId: 'laura', name: 'Bourbon Papayo.', roasterName: "It's not coffee", createdAt: ts(30) } as never },
      { kind: 'cata', via: 'shared', item: { id: 't1', userId: 'camilo', coffeeName: 'Geisha', ratingOverall: 8, brewMethod: 'v60', createdAt: ts(500), sharedAt: ts(2) } as never },
    ], opts)
    expect(list.map(n => n.key)).toEqual(['catat1', 'cafec1'])
    expect(list[0]).toMatchObject({ who: 'Camilo', verb: 'compartió contigo una cata', score: 4, meta: 'Cata · V60 · Muy rico · hace 2 h', isNew: true, link: '/app/tastings/t1' })
    expect(list[1]).toMatchObject({ verb: 'publicó un café', name: 'Bourbon Papayo', meta: "Café · de It's not coffee · ayer", isNew: false })
  })

  it('deja fuera lo tuyo, lo de quien no es tu amigo y lo de hace más de 14 días', () => {
    const list = buildNotices([
      { kind: 'receta', via: 'community', item: { id: 'r1', userId: 'yo', name: 'Mía', createdAt: ts(1) } as never },
      { kind: 'receta', via: 'community', item: { id: 'r2', userId: 'otro', name: 'Ajena', createdAt: ts(1) } as never },
      { kind: 'receta', via: 'community', item: { id: 'r3', userId: 'laura', name: 'Vieja', createdAt: ts(15 * 24) } as never },
    ], opts)
    expect(list).toEqual([])
  })

  it('si llega por los dos caminos, queda «compartió contigo»', () => {
    const item = { id: 'c1', userId: 'laura', name: 'X', createdAt: ts(1) }
    const list = buildNotices([
      { kind: 'cafe', via: 'community', item: item as never },
      { kind: 'cafe', via: 'shared', item: item as never },
    ], opts)
    expect(list).toHaveLength(1)
    expect(list[0]!.verb).toBe('compartió contigo un café')
  })

  it('tiempo relativo', () => {
    expect(timeAgo(NOW - 30_000, NOW)).toBe('hace un momento')
    expect(timeAgo(NOW - 20 * 60_000, NOW)).toBe('hace 20 min')
    expect(timeAgo(NOW - 50 * 3_600_000, NOW)).toBe('hace 2 días')
  })
})
