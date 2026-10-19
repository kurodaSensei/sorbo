/* Service worker de Firebase Cloud Messaging (recordatorio diario).
 * Vive en su propio scope (/firebase-cloud-messaging-push-scope) y convive
 * con el de la PWA. La configuración pública llega en la URL de registro
 * (composables/useReminders.ts), así no se duplica en este archivo.
 * Los avisos llevan `webpush.notification`, así que FCM los muestra solo y,
 * al tocarlos, abre `fcmOptions.link`. */
// Toque en cualquier aviso de Sorbo, se registra antes que el de Firebase para atenderlo
// siempre: el del SDK a veces no abría nada en Android. Lleva al enlace del aviso (la nota
// rápida) dentro de la app.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  const fcm = data.FCM_MSG || {}
  const link = data.link || (fcm.fcmOptions && fcm.fcmOptions.link) || (fcm.notification && fcm.notification.click_action) || '/app/tastings/new'
  event.stopImmediatePropagation()
  event.notification.close()
  event.waitUntil(self.clients.openWindow(new URL(link, self.location.origin).href))
})

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})
firebase.messaging()

