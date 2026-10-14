/* Service worker de Firebase Cloud Messaging (recordatorio diario).
 * Vive en su propio scope (/firebase-cloud-messaging-push-scope) y convive
 * con el de la PWA. La configuración pública llega en la URL de registro
 * (composables/useReminders.ts), así no se duplica en este archivo.
 * Los avisos llevan `webpush.notification`, así que FCM los muestra solo y,
 * al tocarlos, abre `fcmOptions.link`. */
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
