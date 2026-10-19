import { arrayUnion, doc, setDoc, Timestamp } from 'firebase/firestore'
import { sendHourUtc } from '~/functions/src/decide'

// Recordatorio inteligente (diseño en Obsidian: «Sorbo — Recordatorio inteligente»).
// El cliente guarda el token de FCM y la ventana; la Cloud Function
// `dailyReminder` decide cada hora a quién avisar.

export type ReminderWindow = 'morning' | 'afternoon'
const WINDOW_HOUR: Record<ReminderWindow, number> = { morning: 8, afternoon: 14 }

/** Ventana habitual según la hora de las notas: de 12 en adelante, tarde. */
export function learnWindow(hours: number[]): ReminderWindow {
  if (!hours.length) return 'morning'
  const afternoon = hours.filter(h => h >= 12).length
  return afternoon > hours.length / 2 ? 'afternoon' : 'morning'
}

export function useReminders() {
  const { $db, $firebase } = useNuxtApp() as any
  const { userId } = useAuth()
  const config = useRuntimeConfig()

  const prefsRef = () => doc($db, 'userPreferences', userId.value!)

  /** iPhone/iPad solo reciben avisos web si Sorbo está instalada en la pantalla de inicio. */
  function needsInstall(): boolean {
    if (typeof window === 'undefined') return false
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    return ios && !standalone
  }

  /** La persona bloqueó los avisos de Sorbo en el navegador: solo se reactivan desde ahí. */
  function blocked(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied'
  }

  async function supported(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return false
    const { isSupported } = await import('firebase/messaging')
    return isSupported()
  }

  async function token(): Promise<string> {
    const { getMessaging, getToken } = await import('firebase/messaging')
    const c = config.public
    const params = new URLSearchParams({
      apiKey: c.firebaseApiKey, projectId: c.firebaseProjectId,
      messagingSenderId: c.firebaseMessagingSenderId, appId: c.firebaseAppId,
    })
    // Scope propio: convive con el service worker de la PWA.
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, { scope: '/firebase-cloud-messaging-push-scope' })
    return getToken(getMessaging($firebase), { vapidKey: c.firebaseVapidKey, serviceWorkerRegistration: registration })
  }

  /** Pide permiso y activa el recordatorio. Devuelve false si la persona no lo permite. */
  async function enable(window: ReminderWindow): Promise<boolean> {
    if (!userId.value || !(await supported())) return false
    if (await Notification.requestPermission() !== 'granted') return false
    const t = await token()
    await setDoc(prefsRef(), {
      reminders: {
        enabled: true,
        window,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sendHourUtc: sendHourUtc(WINDOW_HOUR[window], new Date().getTimezoneOffset()),
        tokens: arrayUnion(t),
        enabledAt: Timestamp.now(),
      },
    }, { merge: true })
    return true
  }

  async function disable() {
    if (!userId.value) return
    await setDoc(prefsRef(), { reminders: { enabled: false } }, { merge: true })
  }

  async function setWindow(window: ReminderWindow) {
    if (!userId.value) return
    await setDoc(prefsRef(), {
      reminders: {
        window,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sendHourUtc: sendHourUtc(WINDOW_HOUR[window], new Date().getTimezoneOffset()),
      },
    }, { merge: true })
  }

  /** Al guardar una nota: la función sabe que la persona anotó y no la molesta. */
  async function recordNote(at: Date) {
    if (!userId.value) return
    await setDoc(prefsRef(), { activity: { lastNoteAt: Timestamp.fromDate(at) } }, { merge: true })
  }

  /** «Enviar uno de prueba»: la función `sendTestReminder` escribe solo a tus dispositivos. */
  async function sendTest(): Promise<number> {
    const { getFunctions, httpsCallable } = await import('firebase/functions')
    const call = httpsCallable<void, { sent: number }>(getFunctions($firebase, 'us-central1'), 'sendTestReminder')
    return (await call()).data.sent
  }

  return { supported, blocked, needsInstall, enable, disable, setWindow, recordNote, sendTest }
}
