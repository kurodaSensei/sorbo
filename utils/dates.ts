// Fechas de notas: Timestamp de Firestore, { seconds } serializado o Date.

export function toDate(ts: any): Date | null {
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate()
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  return ts instanceof Date ? ts : null
}

/** «Hoy», «Ayer», «Lunes 28» dentro de la semana, «3 sep» después. */
export function dayLabel(d: Date, now = new Date()): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff > 1 && diff < 7) {
    const wd = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d)
    return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()}`
  }
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(d).replace('.', '')
}

export function hourLabel(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «hace 2 h», «ayer», «3 sep» — para el feed. */
export function agoLabel(d: Date, now = new Date()): string {
  const min = Math.round((now.getTime() - d.getTime()) / 60000)
  if (min < 60) return min <= 1 ? 'ahora' : `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const day = dayLabel(d, now)
  return day === 'Ayer' ? 'ayer' : day
}

export function fmtSeconds(s?: number): string {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
