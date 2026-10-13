import { test, expect } from '@playwright/test'
import { gotoApp, openNoteSheet } from './helpers'

test.describe('Navegación v2', () => {
  test('barra inferior: Diario · Amigos · + · Preparar · Yo (móvil)', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile')
    await gotoApp(page)
    const bar = page.getByRole('navigation', { name: 'Navegación' })
    await expect(bar).toBeVisible()
    for (const label of ['Diario', 'Amigos', 'Preparar', 'Yo']) await expect(bar.getByRole('link', { name: label })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Anotar taza' })).toBeVisible()
  })

  test('escritorio: barra lateral sin barra inferior', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    test.fail(true, 'BUG: .tabbar{display:flex} scoped gana a lg:hidden (TabBar.vue)')
    await gotoApp(page)
    await expect(page.getByRole('button', { name: 'Anotar taza' }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegación' })).toBeHidden()
  })

  for (const path of ['/app', '/app/explore', '/app/recipes', '/app/yo']) {
    test(`el + abre «Nueva nota» desde ${path}`, async ({ page }) => {
      await gotoApp(page, path)
      const sheet = await openNoteSheet(page)
      await sheet.getByRole('button', { name: 'Cancelar' }).click()
      await expect(sheet).toBeHidden()
    })
  }

  test('redirecciones v1 → v2', async ({ page }) => {
    await page.goto('/app/wishlist')
    await expect(page).toHaveURL(/\/app\/coffees\?f=wish/)
    await page.goto('/app/tastings')
    await expect(page).toHaveURL(/\/app$/)
  })
})
