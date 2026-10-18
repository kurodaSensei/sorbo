import { describe, expect, it } from 'vitest'
import { formatClock, grindLabel, methodBlobStyle, parseClock } from '../../utils/recipes'

describe('recetas', () => {
  it('formatea y lee tiempos', () => {
    expect(formatClock(210)).toBe('3:30')
    expect(formatClock(5)).toBe('0:05')
    expect(parseClock('3:30')).toBe(210)
    expect(parseClock('45')).toBe(45)
    expect(parseClock('')).toBe(0)
  })
  it('da un color por método y uno neutro si no lo conoce', () => {
    expect(methodBlobStyle('v60').background).toBe('var(--tint)')
    expect(methodBlobStyle('aeropress').background).toBe('var(--accent)')
    expect(methodBlobStyle('other')).toEqual({ background: 'var(--surface)', opacity: 1 })
  })
  it('lee la molienda nueva y la vieja', () => {
    expect(grindLabel('medium_coarse')).toBe('Media gruesa')
    expect(grindLabel(12)).toBe('Gruesa')
    expect(grindLabel(undefined)).toBeNull()
  })
})
