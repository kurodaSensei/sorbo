// Marca una cuenta como admin (claim `admin: true`) para entrar a /app/admin.
// Usa tus credenciales de Google, sin service account:
//   gcloud auth application-default login
//   npm --prefix functions install   (una vez, trae firebase-admin)
//   node scripts/set-admin.mjs tu@correo.com            → la marca
//   node scripts/set-admin.mjs tu@correo.com --quitar   → la desmarca
import { createRequire } from 'node:module'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

const [email, flag] = process.argv.slice(2)
if (!email) {
  console.error('Uso: node scripts/set-admin.mjs <correo> [--quitar]')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: 'coffee-app-85052' })
const auth = getAuth()
const user = await auth.getUserByEmail(email)
const { admin: _, ...rest } = user.customClaims ?? {}
await auth.setCustomUserClaims(user.uid, flag === '--quitar' ? rest : { ...rest, admin: true })
console.log(`${email}: ${flag === '--quitar' ? 'ya no es admin' : 'ahora es admin'}.`)
