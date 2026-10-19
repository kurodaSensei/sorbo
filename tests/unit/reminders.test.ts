import { describe, it, expect } from 'vitest'
import { decide, daysBetween, sendHourUtc, MAX_WEEKLY } from '../../functions/src/decide'

const tz = 'America/Bogota' // UTC−5, sin horario de verano
// 8:00 a. m. en Bogotá = 13:00 UTC
const at = (day: number, hourUtc = 13) => new Date(Date.UTC(2026, 9, day, hourUtc))

describe('recordatorio · decide', () => {
  it('anotó hoy o ayer: nada', () => {
    expect(decide({ lastActivityAt: at(14, 12), tz }, at(14)).send).toBe(false)
    expect(decide({ lastActivityAt: at(13), tz }, at(14)).send).toBe(false)
  })

  it('2–6 días sin anotar: un solo aviso por ciclo', () => {
    const d = decide({ lastActivityAt: at(10), tz }, at(12))
    expect(d).toMatchObject({ send: true, streak: 1, title: '¿Qué estás tomando hoy?' })
    // Ya se avisó en este ciclo: no repite al día siguiente.
    expect(decide({ lastActivityAt: at(10), lastSentAt: at(12), sentStreak: 1, tz }, at(13)).send).toBe(false)
  })

  it('7+ días: uno por semana', () => {
    const base = { lastActivityAt: at(1), lastSentAt: at(3), sentStreak: 1, tz }
    expect(decide(base, at(8)).send).toBe(false) // 5 días desde el último aviso
    const d = decide(base, at(10))
    expect(d).toMatchObject({ send: true, streak: 2, title: 'Hace una semana de tu última taza' })
    expect(decide({ lastActivityAt: at(1), tz }, at(22)).title).toBe('Hace 3 semanas de tu última taza')
  })

  it(`después de ${MAX_WEEKLY} avisos sin respuesta: dormida`, () => {
    expect(decide({ lastActivityAt: at(1), lastSentAt: at(3), sentStreak: MAX_WEEKLY, tz }, at(30)).send).toBe(false)
  })

  it('si vuelve a anotar, el ciclo se reinicia', () => {
    // Aviso viejo (antes de la última nota) no cuenta: a los 2 días vuelve a avisar.
    const d = decide({ lastActivityAt: at(20), lastSentAt: at(5), sentStreak: MAX_WEEKLY, tz }, at(22))
    expect(d).toMatchObject({ send: true, streak: 1 })
  })

  it('cuenta días del calendario local, no de 24 h', () => {
    // 23:00 local del 13 → 7:00 local del 14: es «ayer», aunque pasen 8 h.
    expect(daysBetween(new Date(Date.UTC(2026, 9, 14, 4)), new Date(Date.UTC(2026, 9, 14, 12)), tz)).toBe(1)
  })
})

describe('recordatorio · sendHourUtc', () => {
  it('Bogotá (UTC−5): 8 → 13 UTC y 14 → 19 UTC', () => {
    expect(sendHourUtc(8, 300)).toBe(13)
    expect(sendHourUtc(14, 300)).toBe(19)
  })
  it('Madrid en verano (UTC+2): 8 → 6 UTC', () => {
    expect(sendHourUtc(8, -120)).toBe(6)
  })
  it('zonas de media hora caen dentro de la ventana (India, UTC+5:30 → 8:30 local)', () => {
    expect(sendHourUtc(8, -330)).toBe(3)
  })
  it('da la vuelta al día', () => {
    expect(sendHourUtc(8, -600)).toBe(22) // UTC+10
  })
})
