import type { Timestamp } from 'firebase/firestore'

export function formatDate(timestamp: Timestamp | undefined): string {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateShort(timestamp: Timestamp | undefined): string {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  return date.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatPrice(price: number | undefined): string {
  if (price === undefined) return ''
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

export function formatWeight(weight: number | undefined): string {
  if (weight === undefined) return ''
  return `${weight}g`
}

export function formatAltitude(altitude: number | undefined): string {
  if (altitude === undefined) return ''
  return `${altitude.toLocaleString()} msnm`
}

export function formatRatio(dose: number | undefined, water: number | undefined): string {
  if (!dose || !water) return ''
  const ratio = Math.round(water / dose)
  return `1:${ratio}`
}

export function formatBrewTime(seconds: number | undefined): string {
  if (seconds === undefined) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}

export function getProcessLabel(value: string): string {
  const labels: Record<string, string> = {
    washed: 'Lavado',
    natural: 'Natural',
    honey: 'Honey',
    anaerobic: 'Anaeróbico',
    carbonic: 'Maceración Carbónica',
    experimental: 'Experimental',
    other: 'Otro',
  }
  return labels[value] || value
}

// Devuelve el proceso para añadirlo tras el nombre del café, o '' si el nombre
// ya lo trae («Sidra Honey» + honey). Compara palabra completa, sin tildes ni mayúsculas.
export function processAfterName(name: string, process: string): string {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  const p = norm(process)
  if (!p) return ''
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u')
  return re.test(norm(name)) ? '' : process
}

export function getBrewMethodLabel(value: string): string {
  const labels: Record<string, string> = {
    v60: 'V60',
    kalita: 'Kalita',
    chemex: 'Chemex',
    aeropress: 'AeroPress',
    french_press: 'Prensa Francesa',
    origami: 'Origami',
    suiren: 'Suiren',
    espresso: 'Espresso',
    moka_pot: 'Moka',
    phin: 'Phin',
    cold_brew: 'Cold Brew',
    other: 'Otro',
  }
  return labels[value] || value
}

export function getRoastLevelLabel(value: string): string {
  const labels: Record<string, string> = {
    light: 'Claro',
    medium_light: 'Medio-Claro',
    medium: 'Medio',
    medium_dark: 'Medio-Oscuro',
    dark: 'Oscuro',
  }
  return labels[value] || value
}

/** «Hoy», «Ayer», el día de la semana (hasta 6 días) o «12 oct». */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) {
    const name = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(date)
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(date).replace('.', '')
}

/** Grupo de la lista de catas: «Hoy», «Ayer», «Esta semana», el mes («Octubre») o «Octubre 2025». */
export function dayGroup(date: Date, now: Date = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return 'Esta semana'
  const month = new Intl.DateTimeFormat('es', { month: 'long' }).format(date)
  const label = month.charAt(0).toUpperCase() + month.slice(1)
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`
}
