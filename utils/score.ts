// Puntaje v2: la persona elige 1–5 con palabras; se guarda en
// `ratingOverall` como el doble (2–10) para seguir siendo compatible con las
// catas de v1, que usaban 1–10. Ver design/v2/components/ScorePicker.

export const SCORE_WORDS = ['', 'Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'] as const

export function scoreToRating(score: number): number {
  return score * 2
}

export function ratingToScore(rating?: number | null): number {
  if (typeof rating !== 'number' || rating <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(rating / 2)))
}

export function scoreWord(rating?: number | null): string {
  return SCORE_WORDS[ratingToScore(rating)] || ''
}

// Círculo de color de la tarjeta de café. v2 no tiene fotos: cada café recibe
// un color fijo derivado de su id, así no hace falta guardarlo.
const BLOBS = ['var(--blob-honey)', 'var(--blob-sage)', 'var(--blob-clay)', 'var(--blob-neutral)']

export function coffeeTint(id?: string | null): string {
  if (!id) return BLOBS[3]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BLOBS[h % BLOBS.length]
}
