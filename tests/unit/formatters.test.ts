import { describe, it, expect } from 'vitest'
import {
  formatDate, formatDateShort, formatPrice, formatWeight, formatAltitude, formatRatio,
  formatBrewTime, getProcessLabel, getBrewMethodLabel, getRoastLevelLabel,
} from '~/utils/formatters'

const ts = (d: Date) => ({ toDate: () => d }) as any

describe('formatters', () => {
  it('fechas', () => {
    expect(formatDate(undefined)).toBe('')
    expect(formatDate(ts(new Date(2026, 8, 3)))).toMatch(/3.*sep.*2026/)
    expect(formatDateShort(undefined)).toBe('')
    expect(formatDateShort(ts(new Date(2026, 8, 3)))).not.toContain('2026')
  })
  it('precio COP sin decimales; 0 sí se formatea', () => {
    expect(formatPrice(undefined)).toBe('')
    expect(formatPrice(45000)).toMatch(/45\.000/)
    expect(formatPrice(45000)).not.toMatch(/,\d\d$/)
    expect(formatPrice(0)).toMatch(/0/)
  })
  it('peso y altitud: 0 es un valor válido', () => {
    expect(formatWeight(undefined)).toBe('')
    expect(formatWeight(250)).toBe('250g')
    expect(formatWeight(0)).toBe('0g')
    expect(formatAltitude(undefined)).toBe('')
    expect(formatAltitude(1800)).toMatch(/1.800 msnm|1,800 msnm|1800 msnm/)
  })
  it('ratio redondea y no divide por cero', () => {
    expect(formatRatio(15, 250)).toBe('1:17')
    expect(formatRatio(20, 320)).toBe('1:16')
    expect(formatRatio(0, 250)).toBe('')
    expect(formatRatio(15, undefined)).toBe('')
  })
  it('tiempo de preparación', () => {
    expect(formatBrewTime(undefined)).toBe('')
    expect(formatBrewTime(45)).toBe('45s')
    expect(formatBrewTime(0)).toBe('0s')
    expect(formatBrewTime(60)).toBe('1:00')
    expect(formatBrewTime(185)).toBe('3:05')
  })
  it('etiquetas con fallback al valor crudo', () => {
    expect(getProcessLabel('washed')).toBe('Lavado')
    expect(getProcessLabel('mi_proceso')).toBe('mi_proceso')
    expect(getBrewMethodLabel('v60')).toBe('V60')
    expect(getBrewMethodLabel('french_press')).toBe('Prensa Francesa')
    expect(getBrewMethodLabel('zzz')).toBe('zzz')
    expect(getRoastLevelLabel('medium_light')).toBe('Medio-Claro')
    expect(getRoastLevelLabel('x')).toBe('x')
  })
})
