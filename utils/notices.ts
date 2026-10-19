// Avisos de amigos: arma la lista a partir de lo compartido contigo y lo que tus amigos
// publicaron en la comunidad. Función pura (sin Firebase) para poder probarla.
import type { Coffee, Recipe, Tasting } from '~/types'
import { ratingToScore, scoreWord } from './score'

export type NoticeKind = 'cafe' | 'cata' | 'receta'

export interface NoticeSource {
  kind: NoticeKind
  /** shared = te lo compartieron directo; community = lo publicó en la comunidad. */
  via: 'shared' | 'community'
  item: (Coffee | Tasting | Recipe) & { id: string }
}

export interface Notice {
  key: string
  link: string
  who: string
  ini: string
  verb: string
  name: string
  meta: string
  score: number
  at: number
  isNew: boolean
}

export const NOTICE_DAYS = 14
export const NOTICE_MAX = 20

const NOUN = { cafe: 'un café', cata: 'una cata', receta: 'una receta' } as const
const LABEL = { cafe: 'Café', cata: 'Cata', receta: 'Receta' } as const
const PATH = { cafe: '/app/coffees/', cata: '/app/tastings/', receta: '/app/recipes/' } as const

/** «hace un momento», «hace 20 min», «hace 5 h», «ayer», «hace 3 días». */
export function timeAgo(at: number, now: number): string {
  const min = Math.max(0, Math.floor((now - at) / 60_000))
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

const clean = (s?: string) => (s || '').trim().replace(/\.+$/, '')
const ms = (t?: { toMillis?: () => number }) => t?.toMillis?.() ?? 0

export function buildNotices(
  sources: NoticeSource[],
  { friends, seenAt, now, method }: { friends: Map<string, string>, seenAt: number, now: number, method: (v: string) => string },
): Notice[] {
  const byKey = new Map<string, Notice & { via: NoticeSource['via'] }>()
  for (const { kind, via, item } of sources) {
    const who = item.userId ? friends.get(item.userId) : undefined
    if (!who) continue // solo amigos actuales (y nunca tú)
    const at = ms(item.sharedAt) || ms(item.createdAt)
    if (!at || now - at > NOTICE_DAYS * 86_400_000) continue
    const key = kind + item.id
    // Si llegó por los dos caminos, gana «compartió contigo».
    if (byKey.get(key)?.via === 'shared') continue

    let name = ''
    let detail: string[] = []
    let score = 0
    if (kind === 'cafe') {
      const c = item as Coffee
      name = clean(c.name)
      detail = [c.roasterName ? `de ${clean(c.roasterName)}` : '']
    }
    else if (kind === 'cata') {
      const t = item as Tasting
      name = clean(t.coffeeName)
      score = ratingToScore(t.ratingOverall)
      detail = [t.brewMethod && t.brewMethod !== 'other' ? method(t.brewMethod) : '', scoreWord(t.ratingOverall)]
    }
    else {
      const r = item as Recipe
      name = clean(r.name)
      detail = [r.brewMethod ? method(r.brewMethod) : '']
    }

    byKey.set(key, {
      key,
      via,
      link: PATH[kind] + item.id,
      who,
      ini: who.trim().charAt(0).toUpperCase() || '?',
      verb: via === 'shared' ? `compartió contigo ${NOUN[kind]}` : `publicó ${NOUN[kind]}`,
      name: name || 'Sin nombre',
      meta: [LABEL[kind], ...detail, timeAgo(at, now)].filter(Boolean).join(' · '),
      score,
      at,
      isNew: at > seenAt,
    })
  }
  return [...byKey.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, NOTICE_MAX)
    .map(({ via: _via, ...n }) => n)
}
