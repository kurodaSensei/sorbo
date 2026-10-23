import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { defineString } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { decide } from './decide.js'
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
      }
      catch (e) {
        failed++
        logger.warn('dailyReminder: falló una persona', { uid: docSnap.id, error: String(e) })
      }
    }
    logger.info('dailyReminder', { hourUtc: now.getUTCHours(), candidates: snap.size, sent, failed })
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

// Panel admin «Pulso»: solo para las cuentas de ADMIN_EMAILS, con el correo verificado.
// Devuelve conteos y fechas; nunca el contenido de una nota, café o receta.
// ponytail: lee userId y createdAt de cada documento en cada llamada; con decenas de miles, pasar a contadores.
export const adminPulse = onCall(
  { maxInstances: 1, timeoutSeconds: 60, memory: '256MiB' },
  async (req) => {
    const email = req.auth?.token.email?.toLowerCase()
    const admins = ADMIN_EMAILS.value().toLowerCase().split(',').map(e => e.trim()).filter(Boolean)
    if (!email || req.auth?.token.email_verified !== true || !admins.includes(email)) {
      throw new HttpsError('permission-denied', 'Solo para admin.')
    }
    const db = getFirestore()

    const rows = async (name: string): Promise<Row[]> =>
      (await db.collection(name).select('userId', 'createdAt').get()).docs.map((d) => {
        const at = d.get('createdAt')
        const uid = d.get('userId')
        return { userId: typeof uid === 'string' ? uid : null, createdAt: at instanceof Timestamp ? at.toDate() : null }
      })

    const people = async (): Promise<Person[]> => {
      const out: Person[] = []
      let page: string | undefined
      do {
        const res = await getAuth().listUsers(1000, page)
        for (const u of res.users) out.push({ uid: u.uid, name: u.displayName ?? null, createdAt: new Date(u.metadata.creationTime) })
        page = res.pageToken
      } while (page)
      return out
    }

    const [users, coffees, tastings, recipes, friendships, waitlist] = await Promise.all([
      people(),
      rows('coffees'),
      rows('tastings'),
      rows('recipes'),
      db.collection('friendships').where('status', '==', 'accepted').count().get(),
      db.collection('waitlist').count().get(),
    ])
    return pulse({
      now: new Date(),
      users,
      coffees,
      tastings,
      recipes,
      friendships: friendships.data().count,
      waitlist: waitlist.data().count,
    })
  },
)
