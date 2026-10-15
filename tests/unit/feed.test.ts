import { describe, it, expect } from 'vitest'
import { buildFeed, filterFeed, fromFriends } from '~/utils/feed'

const ts = (s: number) => ({ toMillis: () => s * 1000 })
const t = (id: string, userId: string, s: number, extra = {}) => ({ id, userId, createdAt: ts(s), ...extra }) as any

describe('feed', () => {
  const items = buildFeed([
    { kind: 'tasting', docs: [t('t1', 'me', 10), t('t2', 'ana', 30, { brewDate: ts(50) })] },
    { kind: 'coffee', docs: [t('c1', 'ana', 40)] },
    { kind: 'recipe', docs: [t('r1', 'bob', 20)] },
  ], 'me')

  it('ordena por fecha (brewDate gana en notas) y marca lo mío', () => {
    expect(items.map(i => i.key)).toEqual(['tasting:t2', 'coffee:c1', 'recipe:r1', 'tasting:t1'])
    expect(items.filter(i => i.own).map(i => i.key)).toEqual(['tasting:t1'])
  })

  it('quita repetidos entre fuentes', () => {
    const d = buildFeed([{ kind: 'coffee', docs: [t('c1', 'ana', 1)] }, { kind: 'coffee', docs: [t('c1', 'ana', 1)] }], 'me')
    expect(d).toHaveLength(1)
  })

  it('filtra por tipo', () => {
    expect(filterFeed(items, 'all')).toHaveLength(4)
    expect(filterFeed(items, 'coffee').map(i => i.id)).toEqual(['c1'])
  })

  it('fromFriends deja solo amigos', () => {
    expect(fromFriends([t('a', 'ana', 1), t('b', 'bob', 1), t('c', 'me', 1)], ['ana']).map(d => d.id)).toEqual(['a'])
  })
})
