export interface CatalogItem { value: string; label: string }

// Une los valores de fábrica con los propios (sin repetir) y los ordena por nombre.
// Acepta textos sueltos (variedades, sabores) o pares {value,label} (métodos, procesos).
export function catalogItems(defaults: Array<string | CatalogItem>, custom: Array<string | CatalogItem> = []): CatalogItem[] {
  const seen = new Set<string>()
  return [...defaults, ...custom]
    .map(i => (typeof i === 'string' ? { value: i, label: i } : i))
    .filter(i => !seen.has(i.value) && !!seen.add(i.value))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export const activeCount = (items: CatalogItem[], disabled: string[] = []) =>
  items.filter(i => !disabled.includes(i.value)).length
