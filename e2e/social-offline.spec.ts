import { test, expect } from '@playwright/test'
import { cleanupQa, gotoApp, openNoteSheet, qaName, store } from './helpers'

test.describe('Detalle, Amigos y sin conexión', () => {
  test.afterAll(async ({ browser }, info) => {
    const page = await browser.newPage({ storageState: info.project.use.storageState as string })
    await gotoApp(page)
    await cleanupQa(page)
    await page.close()
  })

  test('Quién la ve → Comunidad; mi nota no sale en mi Descubrir; eliminar', async ({ page }) => {
    const name = qaName('Publica')
    await gotoApp(page)
    const sheet = await openNoteSheet(page)
    await sheet.locator('#nf-cafe').fill(name)
    await sheet.getByRole('button', { name: /2\s*Bien/ }).click()
    await sheet.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page).toHaveURL(/\/app\/tastings\/\w+/)
    const id = page.url().split('/').pop()!

    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByText('Quién la ve').click()
    await page.getByText('Comunidad', { exact: true }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('button', { name: 'Entiendo, compartir' }).click()
    await expect.poll(async () => (await store<any[]>(page, 'tastings', 'list')).find(x => x.id === id)?.visibility).toBe('community')

    await page.goto('/app/explore')
    await page.getByRole('tab', { name: 'Descubrir' }).click()
    await expect(page.getByText(name)).toHaveCount(0)

    await page.goto(`/app/tastings/${id}`)
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByText('Eliminar', { exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(name)).toHaveCount(0)
  })

  test('sin conexión: anotar guarda en ~2,5 s y aparece en el Diario', async ({ page, context }) => {
    const name = qaName('Offline')
    await gotoApp(page)
    await context.setOffline(true)
    const sheet = await openNoteSheet(page)
    await sheet.locator('#nf-cafe').fill(name)
    await sheet.getByRole('button', { name: /4\s*Muy rico/ }).click()
    const t0 = Date.now()
    await sheet.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page).toHaveURL(/\/app\/tastings\/\w+/, { timeout: 8_000 })
    expect(Date.now() - t0).toBeLessThan(6_000)
    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(page.getByText(name).first()).toBeVisible()

    await context.setOffline(false)
    // Al volver la red, la escritura pendiente llega al servidor.
    await page.reload()
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 })
  })
})
