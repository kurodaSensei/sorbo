import { describe, it, expect } from 'vitest'
import { parseStepTime, formatStepTime, sortSteps, ratioOf, recipeHint } from '~/utils/recipeForm'

describe('recipeForm', () => {
  it('parsea tiempos m:ss y segundos sueltos', () => {
    expect(parseStepTime('1:30')).toBe(90)
    expect(parseStepTime(' 45 ')).toBe(45)
    expect(parseStepTime('')).toBe(0)
    expect(parseStepTime('abc')).toBe(0)
    expect(parseStepTime('2:')).toBe(120)
  })
  it('formatea m:ss', () => {
    expect(formatStepTime(0)).toBe('0:00')
    expect(formatStepTime(75)).toBe('1:15')
  })
  it('ordena pasos por tiempo sin mutar', () => {
    const src = [{ timeSeconds: 60, title: 'b' }, { timeSeconds: 0, title: 'a' }]
    expect(sortSteps(src).map(s => s.title)).toEqual(['a', 'b'])
    expect(src[0].title).toBe('b')
  })
  it('calcula la proporción', () => {
    expect(ratioOf(15, 250)).toBe('1:17')
    expect(ratioOf(null, 250)).toBeNull()
    expect(ratioOf(15, 0)).toBeNull()
  })
  it('pide primero lo que falta', () => {
    const ok = { name: 'V60', method: 'v60', dose: 15, water: 250 }
    expect(recipeHint(ok)).toBe('')
    expect(recipeHint({ ...ok, name: ' ' })).toContain('nombre')
    expect(recipeHint({ ...ok, method: '' })).toContain('método')
    expect(recipeHint({ ...ok, dose: null })).toContain('dosis')
    expect(recipeHint({ ...ok, water: 0 })).toContain('agua')
  })
})
