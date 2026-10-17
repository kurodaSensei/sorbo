import { describe, expect, it } from 'vitest'
import { ratingToScore, scoreToRating, scoreTone, scoreWord } from '../../utils/score'

describe('puntaje 1–5', () => {
  it('se guarda como 2–10 y vuelve igual', () => {
    expect([1, 2, 3, 4, 5].map(scoreToRating)).toEqual([2, 4, 6, 8, 10])
    for (const s of [1, 2, 3, 4, 5]) expect(ratingToScore(scoreToRating(s))).toBe(s)
  })
  it('redondea las catas de v1', () => {
    expect(ratingToScore(8.4)).toBe(4)
    expect(ratingToScore(9.1)).toBe(5)
    expect(ratingToScore(7)).toBe(4)
    expect(ratingToScore(1)).toBe(1)
  })
  it('sin puntaje es 0 y sin palabra', () => {
    for (const v of [0, -3, undefined, null, Number.NaN]) {
      expect(ratingToScore(v)).toBe(0)
      expect(scoreWord(v)).toBe('')
    }
  })
  it('palabras y colores', () => {
    expect([2, 4, 6, 8, 10].map(scoreWord)).toEqual(['Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'])
    expect([10, 8, 6, 0].map(scoreTone)).toEqual(['high', 'good', 'none', 'none'])
  })
})
