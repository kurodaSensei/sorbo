import { describe, expect, it } from 'vitest'
import { dayGroup, formatRelativeDay, processAfterName } from '../../utils/formatters'

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

describe('dayGroup', () => {
  const now = new Date(2026, 9, 16, 9, 0)
  it('agrupa por Hoy, Ayer, Esta semana y mes', () => {
    expect(dayGroup(new Date(2026, 9, 16, 22), now)).toBe('Hoy')
    expect(dayGroup(new Date(2026, 9, 15, 23), now)).toBe('Ayer')
    expect(dayGroup(new Date(2026, 9, 11), now)).toBe('Esta semana')
    expect(dayGroup(new Date(2026, 9, 2), now)).toBe('Octubre')
    expect(dayGroup(new Date(2025, 11, 20), now)).toBe('Diciembre 2025')
  })
})

describe('processAfterName', () => {
  it('omite el proceso si el nombre ya lo trae', () => {
    expect(processAfterName('Sidra Honey', 'honey')).toBe('')
    expect(processAfterName('Geisha Anaerobico', 'anaeróbico')).toBe('')
    expect(processAfterName('Caturra LAVADO', 'lavado')).toBe('')
  })

  it('lo conserva si no aparece como palabra completa', () => {
    expect(processAfterName('Sidra', 'honey')).toBe('honey')
    expect(processAfterName('Honeymoon Blend', 'honey')).toBe('honey')
  })

  it('devuelve vacío sin proceso', () => {
    expect(processAfterName('Sidra', '')).toBe('')
  })
})
