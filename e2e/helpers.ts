import { expect, type Page } from '@playwright/test'

// Prefijo para reconocer (y borrar) los datos que crean las pruebas en producción.
export const QA = 'QA-E2E'
export const qaName = (what: string) => `${QA} ${what} ${Date.now().toString(36)}`

export async function gotoApp(page: Page, path = '/app') {
  await page.goto(path)
  // Espera a que se vaya la pantalla de carga inicial.
  await page.locator('main').first().waitFor()
  await page.waitForLoadState('networkidle').catch(() => {})
}

/** Acceso de solo lectura/limpieza a las stores de Pinia de la app. */
export async function store<T>(page: Page, name: string, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(async ([name, fn, args]) => {
    const pinia = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia
    const s = pinia._s.get(name)
    const v = typeof s[fn] === 'function' ? await s[fn](...(args as unknown[])) : s[fn]
    return JSON.parse(JSON.stringify(v ?? null))
  }, [name, fn, args] as const)
}

export async function openNoteSheet(page: Page) {
  const plus = page.locator('.tabbar .plus')
  if (await plus.isVisible()) await plus.click()
  else await page.locator('aside, nav').getByRole('button', { name: 'Anotar taza' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva nota' })
  await expect(sheet).toBeVisible()
  return sheet
}

/** Borra notas y cafés de prueba (prefijo QA) de la cuenta. */
export async function cleanupQa(page: Page) {
  await page.evaluate(async (prefix) => {
    const pinia = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia
    const t = pinia._s.get('tastings'); const c = pinia._s.get('coffees')
    await t.loadAll(); await c.loadAll()
    for (const n of [...t.list].filter((x: any) => x.coffeeName?.startsWith(prefix))) await t.remove(n.id)
    for (const k of [...c.list].filter((x: any) => x.name?.startsWith(prefix))) await c.remove(k.id)
  }, QA)
}
