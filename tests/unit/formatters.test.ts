import { describe, expect, it } from 'vitest'
import { formatRelativeDay } from '../../utils/formatters'

describe('formatRelativeDay', () => {
  const now = new Date(2026, 9, 16, 9, 0) // jueves 16 oct 2026, 9:00

  it('dice Hoy para el mismo día, aunque sea más tarde', () => {
    expect(formatRelativeDay(new Date(2026, 9, 16, 23, 30), now)).toBe('Hoy')
  })
  it('dice Ayer aunque hayan pasado menos de 24 h', () => {
    expect(formatRelativeDay(new Date(2026, 9, 15, 22, 0), now)).toBe('Ayer')
  })
  it('usa el día de la semana hasta 6 días atrás', () => {
    expect(formatRelativeDay(new Date(2026, 9, 12, 8, 0), now)).toBe('Lunes')
  })
  it('usa la fecha corta desde 7 días atrás', () => {
    expect(formatRelativeDay(new Date(2026, 9, 9, 8, 0), now)).toBe('9 oct')
  })
})
