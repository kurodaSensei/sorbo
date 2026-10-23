// Panel admin «Catálogos»: cómo escribe cada nombre la gente, agrupado. Solo lectura.

/** Una vez que alguien usó o guardó un nombre. `uses` = cafés o notas que cuenta (0 si solo lo guardó). */
export interface Entry { userId: string, text: string, uses: number }

export interface Group {
  /** La forma que más personas escriben. */
  name: string
  forms: { text: string, people: number }[]
  people: number
  uses: number
}

// Copia de utils/constants.ts (las funciones no leen la app); un test vigila que sigan iguales.
export const PROCESS_LABELS: Record<string, string> = {
  washed: 'Lavado', natural: 'Natural', honey: 'Honey', anaerobic: 'Anaeróbico',
  carbonic: 'Maceración Carbónica', experimental: 'Experimental', other: 'Otro',
}
export const METHOD_LABELS: Record<string, string> = {
  v60: 'V60', kalita: 'Kalita', chemex: 'Chemex', aeropress: 'AeroPress', french_press: 'Prensa Francesa',
  origami: 'Origami', suiren: 'Suiren', espresso: 'Espresso', moka_pot: 'Moka', phin: 'Phin (Vietnamita)',
  cold_brew: 'Cold Brew', other: 'Otro',
}

/** «  Café de  Andrés. » → «cafe de andres» */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[.\s]+$/u, '').replace(/\s+/g, ' ').trim()
}

export function groupNames(entries: Entry[]): Group[] {
  const groups = new Map<string, { forms: Map<string, Set<string>>, people: Set<string>, uses: number }>()
  for (const e of entries) {
    if (typeof e.text !== 'string') continue
    const text = e.text.trim().replace(/\s+/g, ' ')
    const key = normalize(text)
    if (!key) continue
    let g = groups.get(key)
    if (!g) groups.set(key, g = { forms: new Map(), people: new Set(), uses: 0 })
    if (!g.forms.has(text)) g.forms.set(text, new Set())
    g.forms.get(text)!.add(e.userId)
    g.people.add(e.userId)
    g.uses += e.uses
  }
  return [...groups.values()]
    .map((g) => {
      const forms = [...g.forms].map(([text, who]) => ({ text, people: who.size })).sort((a, b) => b.people - a.people || a.text.localeCompare(b.text))
      return { name: forms[0].text, forms, people: g.people.size, uses: g.uses }
    })
    .sort((a, b) => b.people - a.people || b.uses - a.uses || a.name.localeCompare(b.name))
}
