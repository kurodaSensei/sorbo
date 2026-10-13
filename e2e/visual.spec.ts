import { test, expect } from '@playwright/test'
import { gotoApp, openNoteSheet } from './helpers'

// Capturas de referencia. Las listas con datos reales se enmascaran porque cambian.
// Primera corrida: npx playwright test visual --update-snapshots
test.describe('Visual', () => {
  test('landing', async ({ browser }, info) => {
    const ctx = await browser.newContext({ ...info.project.use, storageState: undefined })
    const page = await ctx.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('landing.png', { fullPage: true })
    await ctx.close()
  })

  test('login', async ({ browser }, info) => {
    const ctx = await browser.newContext({ ...info.project.use, storageState: undefined })
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login.png')
    await ctx.close()
  })

  test('nota rápida vacía', async ({ page }) => {
    await gotoApp(page)
    const sheet = await openNoteSheet(page)
    await expect(sheet).toHaveScreenshot('note-sheet.png', { mask: [sheet.locator('.nf-recents'), sheet.locator('.nf-wrap')] })
  })

  for (const [name, path] of [['diario', '/app'], ['amigos', '/app/explore'], ['preparar', '/app/recipes'], ['yo', '/app/yo'], ['mis-cafes', '/app/coffees'], ['timer', '/app/timer']] as const) {
    test(`pantalla ${name}`, async ({ page }) => {
      await gotoApp(page, path)
      await expect(page).toHaveScreenshot(`${name}.png`, {
        mask: [page.locator('main a, main article, main li, main ul, [class*=card], [class*=stat]')],
      })
    })
  }
})
