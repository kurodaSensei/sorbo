import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { decide } from './decide.js'

initializeApp()

const APP_URL = 'https://www.sorbo.app/app?nueva=1'
const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

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
    logger.info('dailyReminder', { hourUtc: now.getUTCHours(), candidates: snap.size, sent })
  },
)
