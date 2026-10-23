// Lista del panel admin «Usuarios»: conteos y fechas por persona, nunca el contenido.
import { shortName, type Row } from './pulse.js'

export type ReminderWindow = 'morning' | 'afternoon'

export interface PeopleInput {
  users: { uid: string, name: string | null, email: string | null, createdAt: Date }[]
  coffees: Row[]
  tastings: Row[]
  recipes: Row[]
  /** Amistades aceptadas: los dos uids de cada una. */
  friendships: string[][]
  /** Ventana del recordatorio de quien lo tiene encendido. */
  reminders: Map<string, ReminderWindow>
}

export interface PersonRow {
  uid: string
  name: string
  email: string
  /** Nombre y correo completos en minúsculas, solo para buscar. */
  search: string
  since: string
  coffees: number
  notes: number
  recipes: number
  friends: number
  /** Última vez que anotó un café, una nota o una receta. */
  lastAt: string | null
  reminder: ReminderWindow | null
}

/** «julian@gmail.com» → «j•••@gmail.com» */
export function maskEmail(email: string | null): string {
  const [user, domain] = (email ?? '').split('@')
  return user && domain ? `${user[0]}•••@${domain}` : 'Sin correo'
}

export function people(i: PeopleInput): PersonRow[] {
  const count = new Map<string, { coffees: number, notes: number, recipes: number, friends: number, last: number }>()
  const of = (uid: string) => {
    let c = count.get(uid)
    if (!c) count.set(uid, c = { coffees: 0, notes: 0, recipes: 0, friends: 0, last: 0 })
    return c
  }
  const add = (rows: Row[], key: 'coffees' | 'notes' | 'recipes') => {
    for (const r of rows) {
      if (!r.userId) continue
      const c = of(r.userId)
      c[key]++
      if (r.createdAt) c.last = Math.max(c.last, r.createdAt.getTime())
    }
  }
  add(i.coffees, 'coffees')
  add(i.tastings, 'notes')
  add(i.recipes, 'recipes')
  for (const uids of i.friendships) for (const uid of uids) of(uid).friends++

  return i.users
    .map((u) => {
      const c = of(u.uid)
      return {
        uid: u.uid,
        name: shortName(u.name),
        email: maskEmail(u.email),
        search: `${u.name ?? ''} ${u.email ?? ''}`.toLowerCase(),
        since: u.createdAt.toISOString(),
        coffees: c.coffees,
        notes: c.notes,
        recipes: c.recipes,
        friends: c.friends,
        lastAt: c.last ? new Date(c.last).toISOString() : null,
        reminder: i.reminders.get(u.uid) ?? null,
      }
    })
    // Lo más reciente arriba; quien nunca anotó, por fecha de alta.
    .sort((a, b) => (b.lastAt ?? b.since).localeCompare(a.lastAt ?? a.since))
}
