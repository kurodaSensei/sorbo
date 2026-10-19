// Contenido de la imagen para compartir (café, cata o receta). Solo los datos que existan.
import type { Coffee, Recipe, Tasting } from '~/types'
import { coffeeVarieties, formatAltitude, getRoastLevelLabel } from './formatters'
import { formatClock, grindLabel } from './recipes'
import { ratingToScore, scoreWord } from './score'

export type ShareKind = 'cafe' | 'cata' | 'receta'
export type ShareFormat = 'historia' | 'publicacion'

export interface ShareContent {
  eyebrow: string
  name: string
  by: string
  chips: string[]
  rows: [string, string][]
  tiles: [string, string][]
  steps: [string, string][]
  score: number
  word: string
  quote: string
  meta: string
  foot: string
}

interface Labels {
  process: (v: string) => string
  method: (v: string) => string
}

const clean = (s?: string) => (s || '').trim().replace(/\.+$/, '')
const join = (parts: (string | number | undefined | false)[], sep = ' · ') => parts.filter(Boolean).join(sep)

export function shareContent(
  kind: ShareKind,
  item: Coffee | Tasting | Recipe,
  { format, includeNote, labels }: { format: ShareFormat, includeNote: boolean, labels: Labels },
): ShareContent {
  const story = format === 'historia'
  const base: ShareContent = { eyebrow: '', name: '', by: '', chips: [], rows: [], tiles: [], steps: [], score: 0, word: '', quote: '', meta: '', foot: 'sorbo.app' }

  if (kind === 'cafe') {
    const c = item as Coffee
    return {
      ...base,
      eyebrow: join([c.process && c.process !== 'other' && labels.process(c.process), join([c.originRegion, c.originCountry], ', ')]),
      name: clean(c.name) || 'Sin nombre',
      by: clean(c.roasterName),
      chips: (c.flavorNotes || []).slice(0, 4),
      rows: ([
        [coffeeVarieties(c).length > 1 ? 'Variedades' : 'Variedad', coffeeVarieties(c).join(' · ')],
        ['Altura', c.altitude ? formatAltitude(c.altitude) : ''],
        ['Tueste', c.roastLevel ? getRoastLevelLabel(c.roastLevel) : ''],
        ['Puntaje SCA', c.scaScore ? String(c.scaScore) : ''],
      ] as [string, string][]).filter(r => r[1]),
    }
  }

  if (kind === 'cata') {
    const t = item as Tasting
    const ms = t.brewDate?.toMillis?.() ?? 0
    const date = ms ? new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : ''
    const note = includeNote ? clean(t.personalNotes) : ''
    return {
      ...base,
      eyebrow: join(['Mi nota', date]),
      name: clean(t.coffeeName) || 'Sin nombre',
      by: clean(t.roasterName),
      score: ratingToScore(t.ratingOverall),
      word: scoreWord(t.ratingOverall),
      // En la publicación cabe menos: solo la primera frase.
      quote: note && (story ? note : clean(note.split(/(?<=[.!?])\s/)[0])),
      chips: (t.flavorNotes || []).slice(0, 4),
      meta: join([t.brewMethod && t.brewMethod !== 'other' && labels.method(t.brewMethod), t.dose && `${t.dose} g`, t.ratio]),
    }
  }

  const r = item as Recipe
  const steps = [...(r.steps || [])].sort((a, b) => a.timeSeconds - b.timeSeconds)
  const total = steps.length ? steps[steps.length - 1]!.timeSeconds : 0
  const tiles = ([
    ['Dosis', r.dose ? `${r.dose} g` : ''],
    ['Agua', r.water ? `${r.water} ml` : ''],
    ['Ratio', r.ratio || (r.water && r.dose ? `1:${Math.round(r.water / r.dose)}` : '')],
    ['Tiempo', total ? formatClock(total) : ''],
    ['Agua a', r.waterTemp ? `${r.waterTemp} °C` : ''],
    ['Molienda', grindLabel(r.grindSize) || ''],
  ] as [string, string][]).filter(x => x[1])
  const author = clean(r.author)
  return {
    ...base,
    eyebrow: join([labels.method(r.brewMethod), author && author.toLowerCase() !== 'desconocido' && `Receta de ${author}`]),
    name: clean(r.name) || 'Sin nombre',
    tiles: story ? tiles : tiles.slice(0, 4),
    steps: story ? steps.slice(0, 4).map(s => [formatClock(s.timeSeconds), s.title] as [string, string]) : [],
    foot: 'Repítela en sorbo.app',
  }
}

/**
 * Texto que acompaña la imagen al compartir (WhatsApp lo usa como pie de foto; Instagram no).
 * Siempre lleva a sorbo.app: funciona para cualquiera, tenga o no cuenta.
 */
export function shareMessage(kind: ShareKind, item: Coffee | Tasting | Recipe, method: (v: string) => string): string {
  if (kind === 'cafe') {
    const c = item as Coffee
    const by = clean(c.roasterName)
    return `Encontré este café en Sorbo: ${clean(c.name) || 'sin nombre'}${by ? `, de ${by}` : ''}. Anota los tuyos en sorbo.app`
  }
  if (kind === 'cata') {
    const t = item as Tasting
    const score = ratingToScore(t.ratingOverall)
    const verdict = score ? `: ${scoreWord(t.ratingOverall)}, ${score} de 5` : ''
    return `Mi nota de ${clean(t.coffeeName) || 'este café'} en Sorbo${verdict}. Anota la tuya en sorbo.app`
  }
  const r = item as Recipe
  const m = r.brewMethod && r.brewMethod !== 'other' ? method(r.brewMethod) : ''
  return `Mi receta${m ? ` para ${m}` : ''} en Sorbo: ${clean(r.name) || 'sin nombre'}. Repítela en sorbo.app`
}
