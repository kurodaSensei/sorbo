import { describe, it, expect } from 'vitest'
import { SCORE_WORDS, scoreToRating, ratingToScore, scoreWord, coffeeTint } from '~/utils/score'

describe('score', () => {
  it('1–5 se guarda como 2–10', () => {
    expect([1, 2, 3, 4, 5].map(scoreToRating)).toEqual([2, 4, 6, 8, 10])
  })

  it('ida y vuelta es estable para todos los puntajes', () => {
    for (const s of [1, 2, 3, 4, 5]) expect(ratingToScore(scoreToRating(s))).toBe(s)
  })

  it('palabras Meh/Bien/Rico/Muy rico/Wow', () => {
    expect(SCORE_WORDS.slice(1)).toEqual(['Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'])
    expect([2, 4, 6, 8, 10].map(scoreWord)).toEqual(['Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'])
  })

  it('v1 legacy: 8 → 4 «Muy rico»', () => {
    expect(ratingToScore(8)).toBe(4)
    expect(scoreWord(8)).toBe('Muy rico')
  })

  it('valores impares de v1 redondean hacia arriba (7 → 4, 9 → 5, 1 → 1)', () => {
    expect(ratingToScore(7)).toBe(4)
    expect(ratingToScore(9)).toBe(5)
    expect(ratingToScore(1)).toBe(1)
    expect(ratingToScore(3)).toBe(2)
  })

  it('0, negativos, undefined, null y no-números → 0 y sin palabra', () => {
    for (const v of [0, -3, undefined, null, '8' as any]) {
      expect(ratingToScore(v)).toBe(0)
      expect(scoreWord(v)).toBe('')
    }
  })

  it.fails('BUG: NaN debe tratarse como sin puntaje (0)', () => {
    expect(ratingToScore(NaN)).toBe(0)
  })

  it('valores fuera de rango se acotan a 1–5', () => {
    expect(ratingToScore(0.2)).toBe(1)
    expect(ratingToScore(100)).toBe(5)
    expect(scoreWord(100)).toBe('Wow')
  })

  describe('coffeeTint', () => {
    it('es determinista', () => {
      expect(coffeeTint('abc123')).toBe(coffeeTint('abc123'))
    })
    it('sin id → neutro', () => {
      expect(coffeeTint(undefined)).toBe('var(--blob-neutral)')
      expect(coffeeTint(null)).toBe('var(--blob-neutral)')
      expect(coffeeTint('')).toBe('var(--blob-neutral)')
    })
    it('siempre devuelve una variable de blob y usa más de un color', () => {
      const seen = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const c = coffeeTint(`coffee-${i}`)
        expect(c).toMatch(/^var\(--blob-(honey|sage|clay|neutral)\)$/)
        seen.add(c)
      }
      expect(seen.size).toBe(4)
    })
    it('ids muy largos no desbordan', () => {
      expect(coffeeTint('x'.repeat(10000))).toMatch(/^var\(--blob-/)
    })
  })
})
