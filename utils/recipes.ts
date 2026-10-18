// Ayudas de presentación de recetas (v3).

/** 210 → «3:30». */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

/** «3:30» o «210» → 210. Vacío o inválido → 0. */
export function parseClock(input: string): number {
  const t = input.trim()
  if (!t) return 0
  if (t.includes(':')) {
    const [m, s] = t.split(':').map(p => Number.parseInt(p, 10) || 0)
    return m * 60 + (s || 0)
  }
  return Number.parseInt(t, 10) || 0
}

// Círculo de la tarjeta: un color por método, como el proceso en Cafés.
const METHOD_TONES: Record<string, [string, number]> = {
  v60: ['var(--tint)', 0.42],
  origami: ['var(--tint)', 0.3],
  kalita: ['var(--tint)', 0.22],
  chemex: ['var(--primary)', 0.26],
  suiren: ['var(--primary)', 0.18],
  cold_brew: ['var(--primary)', 0.14],
  aeropress: ['var(--accent)', 0.4],
  phin: ['var(--accent)', 0.3],
  moka_pot: ['var(--accent)', 0.22],
  espresso: ['var(--brand-surface)', 0.24],
  french_press: ['var(--brand-surface)', 0.14],
}

export function methodBlobStyle(method?: string): { background: string, opacity: number } {
  const [background, opacity] = (method && METHOD_TONES[method]) || ['var(--surface)', 1]
  return { background, opacity }
}

const GRIND_LABELS: Record<string, string> = {
  fine: 'Fina',
  medium_fine: 'Media fina',
  medium: 'Media',
  medium_coarse: 'Media gruesa',
  coarse: 'Gruesa',
}

/** Molienda legible; acepta la escala numérica vieja (1–15). */
export function grindLabel(g: unknown): string | null {
  if (typeof g === 'string' && GRIND_LABELS[g]) return GRIND_LABELS[g]
  if (typeof g === 'number') return g <= 5 ? 'Fina' : g <= 10 ? 'Media' : 'Gruesa'
  return null
}
