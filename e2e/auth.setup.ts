import { existsSync, readFileSync } from 'node:fs'
import { test as setup, expect } from '@playwright/test'

// Lee .env.e2e si existe (E2E_EMAIL=… / E2E_PASSWORD=…). Nunca se versiona.
if (existsSync('.env.e2e')) {
  for (const line of readFileSync('.env.e2e', 'utf8').split('\n')) {
    const m = line.match(/^\s*(E2E_\w+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

setup('iniciar sesión con la cuenta de pruebas', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) throw new Error('Faltan E2E_EMAIL y E2E_PASSWORD (en el entorno o en .env.e2e)')

  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/app/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Diario' })).toBeVisible({ timeout: 20_000 })
  // Firebase Auth guarda la sesión en IndexedDB.
  await page.context().storageState({ path: 'e2e/.auth/user.json', indexedDB: true })
})
