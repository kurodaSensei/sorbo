// Feed de Amigos: mezcla notas, cafés y recetas en una sola lista por fecha.
import type { Coffee, Recipe, Tasting } from '~/types'

export type FeedKind = 'tasting' | 'coffee' | 'recipe'
export type FeedFilter = 'all' | FeedKind
type Doc = Tasting | Coffee | Recipe

export interface FeedItem {
  key: string
  kind: FeedKind
  id: string
  /** Milisegundos; 0 si no hay fecha. */
  date: number
  /** El documento es mío. */
  own: boolean
  doc: Doc
}

const ms = (d: any): number => d?.toMillis?.() ?? (typeof d?.seconds === 'number' ? d.seconds * 1000 : 0)

function dateOf(doc: any, kind: FeedKind): number {
  return (kind === 'tasting' ? ms(doc.brewDate) : 0) || ms(doc.createdAt)
}

/** Une las fuentes, quita repetidos (kind + id), marca lo mío y ordena de nuevo a antiguo. */
export function buildFeed(
  sources: { kind: FeedKind, docs: Doc[] }[],
  myUid: string | null | undefined,
): FeedItem[] {
  const seen = new Set<string>()
  const out: FeedItem[] = []
  for (const { kind, docs } of sources) {
    for (const doc of docs) {
      const key = `${kind}:${doc.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ key, kind, id: doc.id, date: dateOf(doc, kind), own: !!myUid && (doc as any).userId === myUid, doc })
    }
  }
  return out.sort((a, b) => b.date - a.date)
}

export function filterFeed(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  return filter === 'all' ? items : items.filter(i => i.kind === filter)
}

/** Solo lo que publicaron mis amigos (para Siguiendo). */
export function fromFriends(docs: Doc[], friendUids: string[]): Doc[] {
  const set = new Set(friendUids)
  return docs.filter(d => !!(d as any).userId && set.has((d as any).userId))
}
