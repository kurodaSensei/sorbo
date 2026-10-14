import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { decide } from './decide.js'

initializeApp()

const APP_URL = 'https://www.sorbo.app/app?nueva=1'
const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])
const MAX_TOKENS = 10

// Cada persona escribe su propio documento: nada de lo que hay ahí es confiable.
const validTz = (tz: unknown): string => {
  if (typeof tz !== 'string') return 'America/Bogota'
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz }
  catch { return 'America/Bogota' }
}
const toDate = (v: unknown): Date | null => v instanceof Timestamp ? v.toDate() : null

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
      // Un documento roto no debe dejar sin aviso a los demás.
      try {
        const r = docSnap.get('reminders') ?? {}
        const tokens: string[] = (Array.isArray(r.tokens) ? r.tokens : [])
          .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
          .slice(-MAX_TOKENS)
        if (!tokens.length) continue

        const d = decide({
          lastActivityAt: toDate(docSnap.get('activity.lastNoteAt')) ?? toDate(r.enabledAt) ?? now,
          lastSentAt: toDate(r.lastSentAt),
          sentStreak: Number.isInteger(r.sentStreak) ? r.sentStreak : 0,
          tz: validTz(r.tz),
        }, now)
        if (!d.send) continue

        const res = await getMessaging().sendEachForMulticast({
          tokens,
          webpush: {
            notification: { title: d.title, body: d.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
            fcmOptions: { link: APP_URL },
          },
        })
        const dead = tokens.filter((_, i) => DEAD_TOKEN.has(res.responses[i].error?.code ?? ''))

        await docSnap.ref.update({
          'reminders.lastSentAt': Timestamp.fromDate(now),
          'reminders.sentStreak': d.streak,
          ...(dead.length ? { 'reminders.tokens': FieldValue.arrayRemove(...dead) } : {}),
        })
        sent += res.successCount
      }
      catch (e) {
        failed++
        logger.error('dailyReminder: documento omitido', { uid: docSnap.id, error: String(e) })
      }
    }
    logger.info('dailyReminder', { hourUtc: now.getUTCHours(), candidates: snap.size, sent, failed })
  },
)
