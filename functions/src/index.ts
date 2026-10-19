import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { decide } from './decide.js'

initializeApp()

// Abre la nota rápida de v3. Inicio también redirige los enlaces viejos (/app?nueva=1).
const APP_URL = 'https://www.sorbo.app/app/tastings/new'
const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

/** Envía un aviso a todos los dispositivos y devuelve cuántos llegaron y cuáles ya no existen. */
async function push(tokens: string[], title: string, body: string) {
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    webpush: {
      notification: { title, body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
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
    for (const docSnap of snap.docs) {
      const r = docSnap.get('reminders') ?? {}
      const tokens: string[] = r.tokens ?? []
      if (!tokens.length) continue

      const lastActivity: Timestamp | undefined = docSnap.get('activity.lastNoteAt') ?? r.enabledAt
      const d = decide({
        lastActivityAt: lastActivity?.toDate() ?? now,
        lastSentAt: r.lastSentAt?.toDate() ?? null,
        sentStreak: r.sentStreak ?? 0,
        tz: r.tz || 'America/Bogota',
      }, now)
      if (!d.send) continue

      const res = await push(tokens, d.title!, d.body!)
      const dead = res.dead

      await docSnap.ref.update({
        'reminders.lastSentAt': Timestamp.fromDate(now),
        'reminders.sentStreak': d.streak,
        ...(dead.length ? { 'reminders.tokens': FieldValue.arrayRemove(...dead) } : {}),
      })
      sent += res.sent
    }
    logger.info('dailyReminder', { hourUtc: now.getUTCHours(), candidates: snap.size, sent })
  },
)

// «Enviar uno de prueba» (Ajustes): solo a los dispositivos de quien lo pide, como mucho uno por minuto.
export const sendTestReminder = onCall(
  { maxInstances: 1, timeoutSeconds: 30, memory: '256MiB' },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para probar el aviso.')
    const ref = getFirestore().collection('userPreferences').doc(uid)
    const r = (await ref.get()).get('reminders') ?? {}
    const tokens: string[] = r.tokens ?? []
    if (!r.enabled || !tokens.length) throw new HttpsError('failed-precondition', 'Activa el recordatorio primero.')
    const last: number = r.lastTestAt?.toMillis?.() ?? 0
    if (Date.now() - last < 60_000) throw new HttpsError('resource-exhausted', 'Espera un minuto para enviar otro.')

    const res = await push(tokens, 'Así se verán tus recordatorios', 'Este es de prueba. Tócalo para anotar una taza.')
    await ref.update({
      'reminders.lastTestAt': Timestamp.now(),
      ...(res.dead.length ? { 'reminders.tokens': FieldValue.arrayRemove(...res.dead) } : {}),
    })
    logger.info('sendTestReminder', { sent: res.sent, dead: res.dead.length })
    return { sent: res.sent }
  },
)
