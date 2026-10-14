import { test, expect } from '@playwright/test'
import { cleanupQa, gotoApp, qaName, store } from './helpers'

test.describe('Mis cafés y café', () => {
  test.afterAll(async ({ browser }, info) => {
    const page = await browser.newPage({ storageState: info.project.use.storageState as string })
    await gotoApp(page)
    await cleanupQa(page)
    await page.close()
  })

  test('buscador por nombre o marca', async ({ page }) => {
    await gotoApp(page, '/app/coffees')
    const coffees = await store<any[]>(page, 'coffees', 'list')
    const target = coffees.find(c => c.roasterName)
    test.skip(!target, 'Sin cafés con marca')
    await page.getByLabel('Buscar café o marca').fill(target.roasterName)
    await expect(page.getByText(target.name, { exact: true }).first()).toBeVisible()
  })

  test('filtro Favoritos: promedio ≥ muy rico o nota favorita', async ({ page }) => {
    await gotoApp(page, '/app/coffees')
    const coffees = await store<any[]>(page, 'coffees', 'list')
    const tastings = await store<any[]>(page, 'tastings', 'list')
    const favIds = coffees.filter((c) => {
      const ns = tastings.filter(t => t.coffeeId === c.id)
      if (!ns.length) return false
      const avg = ns.reduce((a, t) => a + (t.ratingOverall || 0), 0) / ns.length
      return avg >= 8 || ns.some(t => t.isFavorite)
    })
    await page.getByRole('button', { name: 'Favoritos' }).click()
    const cards = page.locator('main a[href^="/app/coffees/"]')
    await expect(cards).toHaveCount(favIds.length)
  })

  test('nuevo café → ficha → editar proceso y tueste → guardar', async ({ page }) => {
    const name = qaName('Café')
    await gotoApp(page, '/app/coffees')
    await page.getByRole('link', { name: 'Registrar un café' }).click()
    await page.getByLabel('Nombre').fill(name)
    await page.getByRole('button', { name: 'Guardar café' }).click()
    await expect(page).toHaveURL(/\/app\/coffees\/\w+$/)
    const url = page.url()

    await page.getByText('Proceso y variedad').click()
    await page.getByRole('button', { name: 'Natural', exact: true }).click()
    await page.getByText('Tueste', { exact: true }).click()
    await page.getByRole('button', { name: 'Medio', exact: true }).click()
    await page.getByRole('button', { name: 'Guardar café' }).click()

    await page.goto(url)
    await expect(page.getByLabel('Nombre')).toHaveValue(name)
    await expect(page.getByRole('button', { name: 'Natural', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('Quiero probar → «Anotar» abre la nota con el café', async ({ page }) => {
    await gotoApp(page, '/app/coffees?f=wish')
    const anotar = page.getByRole('button', { name: 'Anotar' }).first()
    test.skip(!(await anotar.isVisible().catch(() => false)), 'Lista Quiero probar vacía')
    await anotar.click()
    const sheet = page.getByRole('dialog', { name: 'Nueva nota' })
    await expect(sheet.getByText('De tu lista Quiero probar · sale de la lista al guardar')).toBeVisible()
    await sheet.getByRole('button', { name: 'Cancelar' }).click() // no se guarda: es un dato real
  })
})
