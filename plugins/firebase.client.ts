import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  }

  const app = initializeApp(firebaseConfig)
  // ignoreUndefinedProperties: campos opcionales vacíos del formulario (SCA score,
  // finca, productor, etc.) llegan como `undefined`. Sin esto Firestore rechaza
  // el documento entero y el usuario lo lee como "el campo es obligatorio".
  //
  // Caché persistente (IndexedDB): las listas abren al instante desde el
  // dispositivo, se leen sin conexión y las notas creadas sin red se envían
  // solas al volver. Si el navegador no tiene IndexedDB (modo privado de
  // algunos navegadores), Firestore sigue funcionando con caché en memoria.
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const storage = getStorage(app)
  const auth = getAuth(app)

  return {
    provide: {
      firebase: app,
      db,
      storage,
      auth,
    },
  }
})
