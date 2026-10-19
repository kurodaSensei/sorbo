import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore'
import type { Coffee, Recipe, Tasting } from '~/types'
import { buildNotices, type Notice, type NoticeKind, type NoticeSource } from '~/utils/notices'

// Avisos de amigos, solo dentro de la app: se calculan al abrir Sorbo con lo compartido
// contigo y lo que tus amigos publicaron en la comunidad. Sin funciones ni avisos push.
// Estado a nivel de módulo: todas las campanas (una por pantalla) ven lo mismo.
const notices = ref<Notice[]>([])
const loadedAt = ref(0)
let loading: Promise<void> | null = null

const COLLECTIONS: [NoticeKind, string][] = [['cafe', 'coffees'], ['cata', 'tastings'], ['receta', 'recipes']]
const FRESH_MS = 5 * 60_000

export function useNotices() {
  const { $db } = useNuxtApp()
  const { userId } = useAuth()
  const settings = useSettingsStore()
  const friendsStore = useFriendsStore()
  const { getSharedWithMe } = useFirebase()
  const { getBrewMethodLabel } = useCatalog()

  const enabled = computed(() => settings.prefs?.notifications?.friends !== false)
  const newCount = computed(() => notices.value.filter(n => n.isNew).length)

  async function fetchAll() {
    if (!settings.prefs) await settings.load().catch(() => {})
    if (!enabled.value || !userId.value) {
      notices.value = []
      return
    }
    if (!friendsStore.list.length) await friendsStore.load().catch(() => {})
    const friends = new Map<string, string>()
    for (const f of friendsStore.accepted) {
      const o = friendsStore.getOtherUser(f)
      if (o?.uid) friends.set(o.uid, o.displayName || o.email?.split('@')[0] || 'Tu amigo')
    }
    if (!friends.size) {
      notices.value = []
      return
    }

    // ponytail: lee todo lo compartido contigo (sin orden ni límite, no hace falta índice).
    // Si alguien acumula cientos, pasar a where(sharedAt >=) con su índice compuesto.
    const uids = [...friends.keys()]
    const chunks: string[][] = []
    for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30))
    const sources: NoticeSource[] = []
    await Promise.all(COLLECTIONS.flatMap(([kind, name]) => [
      getSharedWithMe<(Coffee | Tasting | Recipe) & { id: string }>(name)
        .then(items => items.forEach(item => sources.push({ kind, via: 'shared', item })))
        .catch(() => {}),
      ...chunks.map(chunk => getDocs(query(collection($db, name), where('visibility', '==', 'community'), where('userId', 'in', chunk)))
        .then(snap => snap.docs.forEach(d => sources.push({ kind, via: 'community', item: { id: d.id, ...d.data() } as never })))
        .catch(() => {})),
    ]))

    notices.value = buildNotices(sources, {
      friends,
      seenAt: settings.prefs?.notifications?.seenAt?.toMillis?.() ?? 0,
      now: Date.now(),
      method: getBrewMethodLabel,
    })
  }

  /** Carga si no hay datos o tienen más de 5 minutos. force: siempre. */
  function load(force = false) {
    if (!force && Date.now() - loadedAt.value < FRESH_MS) return Promise.resolve()
    loading ??= fetchAll().finally(() => {
      loadedAt.value = Date.now()
      loading = null
    })
    return loading
  }

  /** Al abrir Avisos: lo de ahora pasa a visto. La lista abierta conserva sus «Nuevo». */
  async function markSeen() {
    if (!userId.value || !newCount.value) return
    const seenAt = Timestamp.now()
    if (settings.prefs) settings.prefs.notifications = { ...settings.prefs.notifications, seenAt }
    await setDoc(doc($db, 'userPreferences', userId.value), { notifications: { seenAt } }, { merge: true }).catch(() => {})
  }

  /** Cuando la hoja se cierra, los nuevos dejan de marcarse. */
  function clearNew() {
    notices.value = notices.value.map(n => (n.isNew ? { ...n, isNew: false } : n))
  }

  async function setEnabled(on: boolean) {
    if (!userId.value || !settings.prefs) return
    settings.prefs.notifications = { ...settings.prefs.notifications, friends: on }
    await setDoc(doc($db, 'userPreferences', userId.value), { notifications: { friends: on } }, { merge: true })
    await load(true)
  }

  return { notices, newCount, enabled, load, markSeen, clearNew, setEnabled }
}
