// Puntaje de catas 1–5 con palabra (de v2). Se guarda en `ratingOverall` como el
// doble (2–10) para seguir leyendo las catas de v1 (0–10) sin migrar nada.

export const SCORE_WORDS = ['', 'Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'] as const

export function scoreToRating(score: number): number {
  return score * 2
}

/** 0–10 guardado → 1–5. Sin puntaje (0, NaN, vacío) → 0. Las de v1 se redondean: 8.4 → 4. */
export function ratingToScore(rating?: number | null): number {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(rating / 2)))
}

export function scoreWord(rating?: number | null): string {
  return SCORE_WORDS[ratingToScore(rating)] || ''
}

/** Color del puntaje: Wow en miel, Muy rico en salvia. */
export function scoreTone(rating?: number | null): 'high' | 'good' | 'none' {
  const s = ratingToScore(rating)
  return s >= 5 ? 'high' : s >= 4 ? 'good' : 'none'
}
