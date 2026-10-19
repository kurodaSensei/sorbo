// Recordatorio inteligente: decide si a una persona le toca un aviso hoy.
// Función pura (sin Firebase) para poder probarla. Diseño en Obsidian:
// «Sorbo — Recordatorio inteligente».
//
// Estados según los días sin anotar (en el calendario local de la persona):
//   0–1  activa / habitual      → nada
//   2–6  se está alejando        → 1 aviso por ciclo
//   7+   inactiva                → 1 por semana, hasta MAX_WEEKLY
//   luego dormida                → nada hasta que vuelva a anotar

export const MAX_WEEKLY = 4

export interface ReminderState {
  /** Última nota; si nunca anotó, cuándo activó el recordatorio. */
  lastActivityAt: Date
  lastSentAt?: Date | null
  /** Avisos enviados desde la última nota. */
  sentStreak?: number
  /** Zona horaria IANA, p. ej. «America/Bogota». */
  tz: string
}

export interface Decision {
  send: boolean
  streak: number
  title?: string
  body?: string
}

/** Fecha local «YYYY-MM-DD» en una zona horaria. */
function localDay(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Días de calendario entre dos fechas, en la zona horaria de la persona. */
export function daysBetween(a: Date, b: Date, tz: string): number {
  const ms = Date.parse(localDay(b, tz)) - Date.parse(localDay(a, tz))
  return Math.round(ms / 86_400_000)
}

export function decide(s: ReminderState, now: Date): Decision {
  const streakNow = s.sentStreak ?? 0
  const idle = daysBetween(s.lastActivityAt, now, s.tz)
  // Un aviso anterior a la última nota pertenece a un ciclo ya cerrado.
  const sentThisCycle = !!s.lastSentAt && s.lastSentAt > s.lastActivityAt
  const streak = sentThisCycle ? streakNow : 0
  const no = { send: false, streak }

  if (idle < 2) return no

  if (idle < 7) {
    if (sentThisCycle) return no
    return { send: true, streak: 1, title: '¿Qué estás tomando hoy?', body: 'Anótalo en 20 segundos.' }
  }

  if (streak >= MAX_WEEKLY) return no
  if (sentThisCycle && daysBetween(s.lastSentAt!, now, s.tz) < 7) return no
  const weeks = Math.floor(idle / 7)
  return {
    send: true,
    streak: streak + 1,
    title: weeks === 1 ? 'Hace una semana de tu última taza' : `Hace ${weeks} semanas de tu última taza`,
    body: '¿La anotamos?',
  }
}

/** Hora UTC de envío para una ventana local (8 = mañana, 14 = tarde). */
export function sendHourUtc(localHour: number, tzOffsetMinutes: number): number {
  // tzOffsetMinutes = Date#getTimezoneOffset() (UTC − local). ceil: en zonas con
  // media hora el aviso cae dentro de la ventana (8:30), no antes (7:30).
  return ((Math.ceil((localHour * 60 + tzOffsetMinutes) / 60) % 24) + 24) % 24
}
