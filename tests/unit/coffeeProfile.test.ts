import { describe, it, expect } from 'vitest'
import { coffeeToProfile, profileKey } from '~/utils/coffeeProfile'

const c = (o: any) => ({ id: '1', name: 'x', ...o }) as any

describe('coffeeProfile', () => {
  it('null/undefined → undefined', () => {
    expect(coffeeToProfile(null)).toBeUndefined()
    expect(coffeeToProfile(undefined)).toBeUndefined()
  })
  it('defaults de un café vacío', () => {
    expect(coffeeToProfile(c({}))).toEqual({ process: 'other', roastBand: 'mid', flavorClass: 'mixed', scoreBand: 'casual' })
  })
  it('tueste en 3 bandas (incluye intermedios de v1)', () => {
    const band = (roastLevel: string) => coffeeToProfile(c({ roastLevel }))!.roastBand
    expect(band('light')).toBe('light')
    expect(band('medium_light')).toBe('light')
    expect(band('medium')).toBe('mid')
    expect(band('medium_dark')).toBe('dark')
    expect(band('dark')).toBe('dark')
  })
  it('SCA: <84 casual, 84–89 specialty, ≥90 topShelf; 0/undefined casual', () => {
    const band = (scaScore?: number) => coffeeToProfile(c({ scaScore }))!.scoreBand
    expect([0, undefined, 83.9].map(band)).toEqual(['casual', 'casual', 'casual'])
    expect([84, 89.9].map(band)).toEqual(['specialty', 'specialty'])
    expect([90, 100].map(band)).toEqual(['topShelf', 'topShelf'])
  })
  it('sabores: una clase dominante, mayúsculas/espacios, o mixed', () => {
    const cls = (flavorNotes: string[]) => coffeeToProfile(c({ flavorNotes }))!.flavorClass
    expect(cls(['Cereza', ' LIMÓN '])).toBe('fruit')
    expect(cls(['Chocolate', 'caramelo'])).toBe('choco')
    expect(cls(['jazmín'])).toBe('floral')
    expect(cls(['almendra'])).toBe('nut')
    expect(cls(['canela'])).toBe('spice')
    expect(cls(['cereza', 'chocolate'])).toBe('mixed')
    expect(cls(['sabor desconocido'])).toBe('mixed')
    expect(cls([])).toBe('mixed')
  })
  it('flavorNotes ausente no revienta', () => {
    expect(coffeeToProfile(c({ flavorNotes: undefined }))!.flavorClass).toBe('mixed')
  })
  it('profileKey serializa en orden estable', () => {
    const p = coffeeToProfile(c({ process: 'washed', roastLevel: 'dark', flavorNotes: ['nuez'], scaScore: 91 }))!
    expect(profileKey(p)).toBe('washed|dark|nut|topShelf')
  })
})
