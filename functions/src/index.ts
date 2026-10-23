import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { defineString } from 'firebase-functions/params'
import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { decide } from './decide.js'
import { type Entry, groupNames, METHOD_LABELS, PROCESS_LABELS } from './catalogs.js'
import { people, type ReminderWindow, withoutHidden } from './people.js'
import { pulse, type Person, type Row } from './pulse.js'

initializeApp()

// Abre la nota rápida de v3. Inicio también redirige los enlaces viejos (/app?nueva=1).
const APP_URL = 'https://www.sorbo.app/app/tastings/new'
const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

// userPreferences lo escribe la persona: se valida aquí lo que llega de ahí.
const MAX_TOKENS = 10
function validTokens(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length < 4096).slice(-MAX_TOKENS) : []
}
function validTz(raw: unknown): string {
  try {
    if (typeof raw === 'string' && raw) return new Intl.DateTimeFormat('en-CA', { timeZone: raw }).resolvedOptions().timeZone
  }
  catch { /* zona inválida: la por defecto */ }
  return 'America/Bogota'
}

/** Envía un aviso a todos los dispositivos y devuelve cuántos llegaron y cuáles ya no existen. */
async function push(tokens: string[], title: string, body: string) {
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    webpush: {
      // badge: la «S.» de una sola tinta; Android lo pinta como silueta.
      notification: { title, body, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png' },
      fcmOptions: { link: APP_URL },
    },
  })
  const dead = tokens.filter((_, i) => DEAD_TOKEN.has(res.responses[i].error?.code ?? ''))
  return { sent: res.successCount, dead }
}

// Cada hora: solo lee a quienes tienen su ventana (mañana o tarde) en esta hora
// UTC, así que cada persona recibe como mucho un aviso al día.
export const dailyReminder = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'UTC',
    // Fondo de $10/mes: una sola instancia y un tiempo corto evitan que un bug
    // se multiplique (las alertas de presupuesto avisan, no cortan).
    maxInstances: 1,
    timeoutSeconds: 60,
    memory: '256MiB',
    retryCount: 0,
  },
  async () => {
    const db = getFirestore()
    const now = new Date()
    const snap = await db.collection('userPreferences')
      .where('reminders.enabled', '==', true)
      .where('reminders.sendHourUtc', '==', now.getUTCHours())
      .get()

    let sent = 0
    let failed = 0
    let pruned = 0
    for (const docSnap of snap.docs) {
      // Un documento raro no corta los avisos de las demás personas de esta hora.
      try {
        const r = docSnap.get('reminders') ?? {}
        const tokens = validTokens(r.tokens)
        if (!tokens.length) continue

        const lastActivity = docSnap.get('activity.lastNoteAt') ?? r.enabledAt
        const d = decide({
          lastActivityAt: lastActivity instanceof Timestamp ? lastActivity.toDate() : now,
          lastSentAt: r.lastSentAt instanceof Timestamp ? r.lastSentAt.toDate() : null,
          sentStreak: typeof r.sentStreak === 'number' ? r.sentStreak : 0,
          tz: validTz(r.tz),
        }, now)
        if (!d.send) continue

        const res = await push(tokens, d.title!, d.body!)
        await docSnap.ref.update({
          'reminders.lastSentAt': Timestamp.fromDate(now),
          'reminders.sentStreak': d.streak,
          ...(res.dead.length ? { 'reminders.tokens': FieldValue.arrayRemove(...res.dead) } : {}),
        })
        sent += res.sent
        pruned += res.dead.length
      }
      catch (e) {
        failed++
        logger.warn('dailyReminder: falló una persona', { uid: docSnap.id, error: String(e) })
      }
    }
    logger.info('dailyReminder', { hourUtc: now.getUTCHours(), candidates: snap.size, sent, failed, pruned })
    // Para la pantalla Salud del admin. ponytail: 24 documentos al día sin borrar; poner un TTL si algún día pesa.
    await db.collection('adminRuns').add({ at: Timestamp.fromDate(now), candidates: snap.size, sent, failed, pruned })
      .catch(e => logger.warn('dailyReminder: no se guardó la corrida', { error: String(e) }))
  },
)

// «Enviar uno de prueba» (Ajustes): solo a los dispositivos de quien lo pide, como mucho uno por minuto.
export const sendTestReminder = onCall(
  { maxInstances: 1, timeoutSeconds: 30, memory: '256MiB' },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para probar el aviso.')
    const db = getFirestore()
    const ref = db.collection('userPreferences').doc(uid)
    const r = (await ref.get()).get('reminders') ?? {}
    const tokens = validTokens(r.tokens)
    if (r.enabled !== true || !tokens.length) throw new HttpsError('failed-precondition', 'Activa el recordatorio primero.')

    // El límite vive en reminderTests, que las reglas no dejan tocar desde la app.
    const limitRef = db.collection('reminderTests').doc(uid)
    const allowed = await db.runTransaction(async (tx) => {
      const last = (await tx.get(limitRef)).get('at')
      if (last instanceof Timestamp && Date.now() - last.toMillis() < 60_000) return false
      tx.set(limitRef, { at: Timestamp.now() })
      return true
    })
    if (!allowed) throw new HttpsError('resource-exhausted', 'Espera un minuto para enviar otro.')

    const res = await push(tokens, 'Así se verán tus recordatorios', 'Este es de prueba. Tócalo para anotar una taza.')
    if (res.dead.length) await ref.update({ 'reminders.tokens': FieldValue.arrayRemove(...res.dead) })
    logger.info('sendTestReminder', { sent: res.sent, dead: res.dead.length })
    return { sent: res.sent }
  },
)

// Correos admin, separados por coma. Viven en functions/.env (no va a git).
const ADMIN_EMAILS = defineString('ADMIN_EMAILS')
// Cuentas de prueba que el panel no cuenta en ningún lado. También en functions/.env.
const HIDDEN_EMAILS = defineString('HIDDEN_EMAILS', { default: '' })
const emails = (raw: string) => raw.toLowerCase().split(',').map(e => e.trim()).filter(Boolean)

// Panel admin (/app/admin): solo las cuentas de ADMIN_EMAILS, con el correo verificado.
// Devuelve conteos y fechas; nunca el contenido de una nota, café o receta.
function requireAdmin(auth: CallableRequest['auth']) {
  const email = auth?.token.email?.toLowerCase()
  const admins = emails(ADMIN_EMAILS.value())
  if (!email || auth?.token.email_verified !== true || !admins.includes(email)) {
    throw new HttpsError('permission-denied', 'Solo para admin.')
  }
}
const ADMIN_OPTS = { maxInstances: 1, timeoutSeconds: 60, memory: '256MiB' } as const

// ponytail: lee userId y createdAt de cada documento en cada llamada; con decenas de miles, pasar a contadores.
async function rows(name: string): Promise<Row[]> {
  return (await getFirestore().collection(name).select('userId', 'createdAt').get()).docs.map((d) => {
    const at = d.get('createdAt')
    const uid = d.get('userId')
    return { userId: typeof uid === 'string' ? uid : null, createdAt: at instanceof Timestamp ? at.toDate() : null }
  })
}

async function accounts() {
  const out: (Person & { email: string | null })[] = []
  let page: string | undefined
  do {
    const res = await getAuth().listUsers(1000, page)
    for (const u of res.users) out.push({ uid: u.uid, name: u.displayName ?? null, email: u.email ?? null, createdAt: new Date(u.metadata.creationTime) })
    page = res.pageToken
  } while (page)
  return out
}

// Todo lo que cuentan Pulso y Usuarios, ya sin las cuentas de prueba.
async function dataset() {
  const [users, coffees, tastings, recipes, friendships] = await Promise.all([
    accounts(),
    rows('coffees'),
    rows('tastings'),
    rows('recipes'),
    getFirestore().collection('friendships').where('status', '==', 'accepted').select('uids').get(),
  ])
  return withoutHidden({
    users,
    coffees,
    tastings,
    recipes,
    friendships: friendships.docs.map(d => d.get('uids')).filter((u): u is string[] => Array.isArray(u)),
  }, emails(HIDDEN_EMAILS.value()))
}

export const adminPulse = onCall(ADMIN_OPTS, async (req) => {
  requireAdmin(req.auth)
  const hidden = emails(HIDDEN_EMAILS.value())
  const [d, waitlist] = await Promise.all([dataset(), getFirestore().collection('waitlist').select().get()])
  return pulse({
    now: new Date(),
    ...d,
    friendships: d.friendships.length,
    waitlist: waitlist.docs.filter(w => !hidden.includes(w.id)).length,
  })
})

export const adminUsers = onCall(ADMIN_OPTS, async (req) => {
  requireAdmin(req.auth)
  const [d, prefs] = await Promise.all([
    dataset(),
    getFirestore().collection('userPreferences').where('reminders.enabled', '==', true).select('reminders.window').get(),
  ])
  const reminders = new Map<string, ReminderWindow>()
  for (const p of prefs.docs) reminders.set(p.id, p.get('reminders.window') === 'afternoon' ? 'afternoon' : 'morning')
  return people({ ...d, reminders })
})

// Catálogos (solo lectura): cómo escribe la gente marcas, variedades, procesos y métodos.
// ponytail: lee cafés, notas y recetas completos (solo los campos de catálogo) en cada llamada, igual que Pulso.
export const adminCatalogs = onCall(ADMIN_OPTS, async (req) => {
  requireAdmin(req.auth)
  const db = getFirestore()
  const hidden = emails(HIDDEN_EMAILS.value())
  const [users, roasters, coffees, tastings, recipes, prefs] = await Promise.all([
    accounts(),
    db.collection('roasters').select('userId', 'name').get(),
    db.collection('coffees').select('userId', 'roasterId', 'roasterName', 'variety', 'varieties', 'process').get(),
    db.collection('tastings').select('userId', 'brewMethod').get(),
    db.collection('recipes').select('userId', 'brewMethod').get(),
    db.collection('userPreferences').select('customProcesses', 'customBrewMethods').get(),
  ])
  // Solo personas reales: fuera las cuentas de prueba y los documentos sin dueño.
  const visible = new Set(users.filter(u => !(u.email && hidden.includes(u.email.toLowerCase()))).map(u => u.uid))
  const own = <T extends { get: (f: string) => unknown }>(docs: T[]) => docs.filter((d) => {
    const uid = d.get('userId')
    return typeof uid === 'string' && visible.has(uid)
  })
  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  // Las etiquetas que cada persona les puso a sus procesos y métodos propios.
  const custom = (field: string) => {
    const m = new Map<string, Map<string, string>>()
    for (const d of prefs.docs) {
      const list = d.get(field)
      if (Array.isArray(list)) m.set(d.id, new Map(list.filter(o => o && typeof o.value === 'string').map(o => [o.value, str(o.label) || o.value])))
    }
    return m
  }
  const customProcess = custom('customProcesses')
  const customMethod = custom('customBrewMethods')
  const label = (defaults: Record<string, string>, mine: Map<string, Map<string, string>>, uid: string, value: string) =>
    // hasOwn: un valor como «constructor» no debe leer propiedades del objeto.
    (Object.hasOwn(defaults, value) ? defaults[value] : undefined) ?? mine.get(uid)?.get(value) ?? value

  const roasterName = new Map<string, string>()
  const brands: Entry[] = []
  for (const d of own(roasters.docs)) {
    roasterName.set(d.id, str(d.get('name')))
    brands.push({ userId: d.get('userId') as string, text: str(d.get('name')), uses: 0 })
  }
  const varieties: Entry[] = []
  const processes: Entry[] = []
  for (const d of own(coffees.docs)) {
    const uid = d.get('userId') as string
    const brand = roasterName.get(str(d.get('roasterId'))) || str(d.get('roasterName'))
    if (brand) brands.push({ userId: uid, text: brand, uses: 1 })
    const list = d.get('varieties')
    for (const v of Array.isArray(list) && list.length ? list : [d.get('variety')]) if (str(v)) varieties.push({ userId: uid, text: str(v), uses: 1 })
    const p = str(d.get('process'))
    if (p) processes.push({ userId: uid, text: label(PROCESS_LABELS, customProcess, uid, p), uses: 1 })
  }
  const methods: Entry[] = []
  for (const d of [...own(tastings.docs), ...own(recipes.docs)]) {
    const uid = d.get('userId') as string
    const m = str(d.get('brewMethod'))
    if (m) methods.push({ userId: uid, text: label(METHOD_LABELS, customMethod, uid, m), uses: 1 })
  }
  return { brands: groupNames(brands), varieties: groupNames(varieties), processes: groupNames(processes), methods: groupNames(methods) }
})

// Salud: corridas del recordatorio (las escribe dailyReminder) y la lista de espera completa, para el CSV.
export const adminHealth = onCall(ADMIN_OPTS, async (req) => {
  requireAdmin(req.auth)
  const db = getFirestore()
  const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : null)
  const [runs, waitlist] = await Promise.all([
    db.collection('adminRuns').orderBy('at', 'desc').limit(12).get(),
    db.collection('waitlist').get(),
  ])
  return {
    runs: runs.docs.map(d => ({
      at: iso(d.get('at')),
      candidates: d.get('candidates') ?? 0,
      sent: d.get('sent') ?? 0,
      failed: d.get('failed') ?? 0,
      pruned: d.get('pruned') ?? 0,
    })),
    waitlist: waitlist.docs
      .filter(d => !emails(HIDDEN_EMAILS.value()).includes(d.id))
      .map(d => ({ email: d.id, source: String(d.get('source') ?? ''), createdAt: iso(d.get('createdAt')) }))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  }
})
