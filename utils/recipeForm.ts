import type { RecipeStep } from '~/types'

/** «1:30», «90» o «» → segundos. Lo no numérico cuenta como 0. */
export function parseStepTime(input: string): number {
  const t = input.trim()
  if (!t) return 0
  const [m, s] = t.includes(':') ? t.split(':') : ['0', t]
  return Math.max(0, (Number.parseInt(m, 10) || 0) * 60 + (Number.parseInt(s, 10) || 0))
}

/** Segundos → «m:ss» (0 → «0:00», a diferencia de fmtSeconds). */
export function formatStepTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export const sortSteps = (steps: RecipeStep[]): RecipeStep[] =>
  [...steps].sort((a, b) => a.timeSeconds - b.timeSeconds)

/** «1:16» o null si falta dosis o agua. */
export function ratioOf(dose?: number | null, water?: number | null): string | null {
  if (!dose || !water || dose <= 0 || water <= 0) return null
  return `1:${Math.round(water / dose)}`
}

/** Pista corta del primer dato que falta, o '' si se puede guardar. */
export function recipeHint(f: { name: string, method: string, dose: number | null, water: number | null }): string {
  if (!f.name.trim()) return 'Ponle un nombre a la receta'
  if (!f.method) return 'Elige un método'
  if (!f.dose || f.dose <= 0) return 'Falta la dosis'
  if (!f.water || f.water <= 0) return 'Falta el agua'
  return ''
}
