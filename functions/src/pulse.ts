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
  /** Notas por semana (lunes a domingo, hora de Bogotá), la más vieja primero. */
  weekly: { start: string, notes: number }[]
  funnel: { registered: number, firstCoffee: number, firstNote: number, threeNotes: number }
  recent: { name: string, createdAt: string, coffee: boolean, note: boolean, three: boolean }[]
  totals: { coffees: number, notes: number, recipes: number, friendships: number, waitlist: number }
}

const DAY = 86_400_000
export const WEEKS = 12
// Activación: llegar a 3 notas.
export const ACTIVATED = 3
// ponytail: Bogotá no tiene horario de verano, así que un desfase fijo basta.
const BOGOTA = -5 * 3_600_000

/** Lunes 00:00 (Bogotá) de la semana de `d`, en UTC. */
export function weekStart(d: Date): Date {
  const local = new Date(d.getTime() + BOGOTA)
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - ((local.getUTCDay() + 6) % 7) * DAY
  return new Date(monday - BOGOTA)
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

  const first = weekStart(i.now).getTime() - (WEEKS - 1) * 7 * DAY
  const buckets = Array.from({ length: WEEKS }, () => 0)
  for (const r of i.tastings) {
    if (!r.createdAt) continue
    const k = Math.floor((r.createdAt.getTime() - first) / (7 * DAY))
    if (k >= 0 && k < WEEKS) buckets[k]++
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
    weekly: buckets.map((notes, k) => ({ start: new Date(first + k * 7 * DAY).toISOString(), notes })),
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
