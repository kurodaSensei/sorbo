import type { Coffee, Recipe, Tasting } from '~/types'

export type FeedItem =
  | { kind: 'coffee'; id: string; createdAtMs: number; data: Coffee }
  | { kind: 'tasting'; id: string; createdAtMs: number; data: Tasting }
  | { kind: 'recipe'; id: string; createdAtMs: number; data: Recipe }

export type FeedKindFilter = 'all' | 'coffee' | 'tasting' | 'recipe'

function tsMillis(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}

/**
 * Feed de Explora: items marcados como 'community' de las tres colecciones,
 * mezclados y ordenados cronológicamente. Incluye los del propio usuario —
 * en una beta temprana con poco contenido, esconder lo tuyo daba la falsa
 * impresión de que tu publicación no había llegado.
 */
export const useCommunityFeed = () => {
  const { getCommunityFeed } = useFirebase()

  const items = ref<FeedItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // Filtro por tipo. Persiste durante la sesión pero se reinicia al recargar
  // — un filtro de Explora no merece guardarse en localStorage.
  const selectedKind = ref<FeedKindFilter>('all')

  const filteredItems = computed(() =>
    selectedKind.value === 'all'
      ? items.value
      : items.value.filter(item => item.kind === selectedKind.value),
  )

  const counts = computed(() => ({
    all: items.value.length,
    coffee: items.value.filter(i => i.kind === 'coffee').length,
    tasting: items.value.filter(i => i.kind === 'tasting').length,
    recipe: items.value.filter(i => i.kind === 'recipe').length,
  }))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [coffees, tastings, recipes] = await Promise.all([
        getCommunityFeed<Coffee>('coffees'),
        getCommunityFeed<Tasting>('tastings'),
        getCommunityFeed<Recipe>('recipes'),
      ])

      const merged: FeedItem[] = [
        ...coffees.map(c => ({ kind: 'coffee' as const, id: c.id, createdAtMs: tsMillis(c.createdAt), data: c })),
        ...tastings.map(t => ({ kind: 'tasting' as const, id: t.id, createdAtMs: tsMillis(t.createdAt), data: t })),
        ...recipes.map(r => ({ kind: 'recipe' as const, id: r.id, createdAtMs: tsMillis(r.createdAt), data: r })),
      ]

      items.value = merged.sort((a, b) => b.createdAtMs - a.createdAtMs)
      loaded.value = true
    }
    catch (e: any) {
      // El error más probable en el primer uso es el índice compuesto faltante.
      error.value = e?.code === 'failed-precondition'
        ? 'Explora necesita un índice de Firestore. Revisa la consola para crearlo.'
        : (e?.message ?? 'No se pudo cargar Explora')
      console.error('[useCommunityFeed] load failed:', e)
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    filteredItems,
    counts,
    selectedKind,
    loading,
    error,
    loaded,
    load,
  }
}
