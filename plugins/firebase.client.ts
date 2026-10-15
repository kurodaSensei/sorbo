import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'
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
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
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
