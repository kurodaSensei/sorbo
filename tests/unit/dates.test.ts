import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toDate, dayLabel, hourLabel, agoLabel, fmtSeconds } from '~/utils/dates'

// Martes 13 oct 2026, 15:30 hora local.
const NOW = new Date(2026, 9, 13, 15, 30)
const daysAgo = (n: number, h = 9) => new Date(2026, 9, 13 - n, h, 0)

describe('dates', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => vi.useRealTimers())

  describe('toDate', () => {
    it('acepta Timestamp (toDate), {seconds}, Date', () => {
      const d = new Date(2026, 0, 2)
      expect(toDate({ toDate: () => d })).toBe(d)
      expect(toDate({ seconds: 1700000000 })!.getTime()).toBe(1700000000000)
      expect(toDate(d)).toBe(d)
    })
    it('seconds = 0 es una fecha válida (1970), no vacío', () => {
      expect(toDate({ seconds: 0 })!.getTime()).toBe(0)
    })
    it('vacíos y basura → null', () => {
      for (const v of [null, undefined, '', 'hoy', 12345, {}]) expect(toDate(v)).toBeNull()
    })
  })

  describe('dayLabel (usa la hora del sistema por defecto)', () => {
    it('Hoy, también a las 00:00 y 23:59', () => {
      expect(dayLabel(new Date(2026, 9, 13, 0, 0))).toBe('Hoy')
      expect(dayLabel(new Date(2026, 9, 13, 23, 59))).toBe('Hoy')
    })
    it('Ayer aunque hayan pasado menos de 24 h', () => {
      expect(dayLabel(new Date(2026, 9, 12, 23, 59))).toBe('Ayer')
    })
    it('2–6 días atrás → día de la semana capitalizado + número', () => {
      expect(dayLabel(daysAgo(2))).toBe('Domingo 11')
      expect(dayLabel(daysAgo(6))).toBe('Miércoles 7')
    })
    it('7 días o más → fecha corta sin punto; con año si es otro año', () => {
      expect(dayLabel(daysAgo(7))).toMatch(/^6 oct/)
      expect(dayLabel(daysAgo(7))).not.toContain('.')
      expect(dayLabel(daysAgo(7))).not.toContain('2026')
      expect(dayLabel(new Date(2025, 8, 3))).toMatch(/^3 sep.* 2025$/)
    })
    it('cruza el cambio de mes/año', () => {
      expect(dayLabel(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe('Ayer')
      expect(dayLabel(new Date(2025, 11, 31), new Date(2026, 0, 1))).toBe('Ayer')
    })
    it('fecha futura no se etiqueta Hoy/Ayer', () => {
      expect(dayLabel(new Date(2026, 9, 20))).not.toMatch(/Hoy|Ayer/)
    })
  })

  it('hourLabel rellena minutos, no horas', () => {
    expect(hourLabel(new Date(2026, 0, 1, 9, 5))).toBe('9:05')
    expect(hourLabel(new Date(2026, 0, 1, 0, 0))).toBe('0:00')
    expect(hourLabel(new Date(2026, 0, 1, 23, 59))).toBe('23:59')
  })

  describe('agoLabel', () => {
    const ago = (min: number) => new Date(NOW.getTime() - min * 60000)
    it('menos de 2 min → ahora (incluye futuro leve)', () => {
      expect(agoLabel(ago(0))).toBe('ahora')
      expect(agoLabel(ago(1))).toBe('ahora')
      expect(agoLabel(ago(-5))).toBe('ahora')
    })
    it('minutos y horas', () => {
      expect(agoLabel(ago(2))).toBe('hace 2 min')
      expect(agoLabel(ago(59))).toBe('hace 59 min')
      expect(agoLabel(ago(120))).toBe('hace 2 h')
    })
    it('ayer / fecha según el día calendario', () => {
      expect(agoLabel(new Date(2026, 9, 12, 8, 0))).toBe('ayer')
      expect(agoLabel(new Date(2026, 9, 10, 8, 0))).toBe('Sábado 10')
    })
    it.fails('BUG: una nota de hoy a 23,8 h de distancia no debe decir «Hoy» en un feed de tiempo relativo', () => {
      // 00:10 de hoy visto a las 23:59 → 23,8 h → redondea a 24 → cae a dayLabel → «Hoy»
      expect(agoLabel(new Date(2026, 9, 13, 0, 10), new Date(2026, 9, 13, 23, 59))).toMatch(/^hace/)
    })
  })

  it('fmtSeconds', () => {
    expect(fmtSeconds(0)).toBe('')
    expect(fmtSeconds(undefined)).toBe('')
    expect(fmtSeconds(5)).toBe('0:05')
    expect(fmtSeconds(180)).toBe('3:00')
    expect(fmtSeconds(3725)).toBe('62:05')
  })
})
