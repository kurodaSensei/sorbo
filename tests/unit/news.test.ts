import { describe, it, expect } from 'vitest'
import { NEWS, showNews } from '../../utils/news'

describe('novedades', () => {
  const before = new Date('2026-06-01')
  const after = new Date('2026-10-20')

  it('solo a quien tenía cuenta antes, una vez', () => {
    expect(showNews(before, undefined)).toBe(true)
    expect(showNews(before, NEWS.id)).toBe(false)
    expect(showNews(after, undefined)).toBe(false)
    expect(showNews(null, undefined)).toBe(false)
  })

  it('un anuncio nuevo vuelve a salir aunque se cerrara el anterior', () => {
    expect(showNews(before, '2026-10-compartir', { ...NEWS, id: '2027-01-algo' })).toBe(true)
  })
})
