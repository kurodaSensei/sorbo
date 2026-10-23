// Cifras del panel admin («Pulso»). Solo conteos y fechas: nunca el contenido de una nota.

export interface Row { userId: string | null, createdAt: Date | null }
export interface Person { uid: string, name: string | null, createdAt: Date }

export interface PulseInput {
  now: Date
  users: Person[]
  coffees: Row[]
  tastings: Row[]
  recipes: Row[]
  friendships: number
  waitlist: number
}

export interface Window { newUsers: number, active: number, notes: number }

export interface Pulse {
  at: string
  registered: number
  week: Window
  month: Window
  /** Notas por mes (hora de Bogotá), desde el primer mes con notas y como mucho 12, el más viejo primero. */
  monthly: { start: string, notes: number }[]
  funnel: { registered: number, firstCoffee: number, firstNote: number, threeNotes: number }
  recent: { name: string, createdAt: string, coffee: boolean, note: boolean, three: boolean }[]
  totals: { coffees: number, notes: number, recipes: number, friendships: number, waitlist: number }
}

const DAY = 86_400_000
export const MONTHS = 12
// Activación: llegar a 3 notas.
export const ACTIVATED = 3
// ponytail: Bogotá no tiene horario de verano, así que un desfase fijo basta.
const BOGOTA = -5 * 3_600_000

/** Día 1 a las 00:00 (Bogotá) del mes de `d`, `add` meses después, en UTC. */
export function monthStart(d: Date, add = 0): Date {
  const local = new Date(d.getTime() + BOGOTA)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + add, 1) - BOGOTA)
}

/** «Laura Martínez» → «Laura M.» */
export function shortName(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Sin nombre'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

export function pulse(i: PulseInput): Pulse {
  const now = i.now.getTime()

  const perUser = (rows: Row[]) => {
    const m = new Map<string, number>()
    for (const r of rows) if (r.userId) m.set(r.userId, (m.get(r.userId) ?? 0) + 1)
    return m
  }
  const coffeesBy = perUser(i.coffees)
  const notesBy = perUser(i.tastings)

  const window = (days: number): Window => {
    const from = now - days * DAY
    const inside = (r: Row) => !!r.createdAt && r.createdAt.getTime() >= from
    const active = new Set<string>()
    for (const r of [...i.coffees, ...i.tastings, ...i.recipes]) if (r.userId && inside(r)) active.add(r.userId)
    return {
      newUsers: i.users.filter(u => u.createdAt.getTime() >= from).length,
      active: active.size,
      notes: i.tastings.filter(inside).length,
    }
  }

  const dates = i.tastings.flatMap(r => (r.createdAt ? [r.createdAt.getTime()] : []))
  const oldest = monthStart(i.now, -(MONTHS - 1)).getTime()
  const from = monthStart(new Date(Math.max(oldest, Math.min(now, ...dates))))
  const months: { start: string, notes: number }[] = []
  for (let k = 0; monthStart(from, k).getTime() <= now; k++) {
    const start = monthStart(from, k).getTime()
    const end = monthStart(from, k + 1).getTime()
    months.push({ start: new Date(start).toISOString(), notes: dates.filter(t => t >= start && t < end).length })
  }

  const steps = (uid: string) => {
    const notes = notesBy.get(uid) ?? 0
    return { coffee: coffeesBy.has(uid), note: notes > 0, three: notes >= ACTIVATED }
  }
  const all = i.users.map(u => steps(u.uid))

  return {
    at: i.now.toISOString(),
    registered: i.users.length,
    week: window(7),
    month: window(30),
    monthly: months,
    funnel: {
      registered: i.users.length,
      firstCoffee: all.filter(s => s.coffee).length,
      firstNote: all.filter(s => s.note).length,
      threeNotes: all.filter(s => s.three).length,
    },
    recent: [...i.users]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(u => ({ name: shortName(u.name), createdAt: u.createdAt.toISOString(), ...steps(u.uid) })),
    totals: {
      coffees: i.coffees.length,
      notes: i.tastings.length,
      recipes: i.recipes.length,
      friendships: i.friendships,
      waitlist: i.waitlist,
    },
  }
}
