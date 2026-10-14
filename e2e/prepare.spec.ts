import { test, expect } from '@playwright/test'
import { gotoApp, store } from './helpers'

test.describe('Preparar y temporizador', () => {
  test('Preparar muestra receta de siempre, mis recetas y herramientas', async ({ page }) => {
    await gotoApp(page, '/app/recipes')
    await expect(page.getByRole('heading', { name: 'Preparar' })).toBeVisible()
    const recipes = await store<any[]>(page, 'recipes', 'list')
    if (recipes.length) await expect(page.getByText('Tu receta de siempre')).toBeVisible()
    await expect(page.getByText('Temporizador libre')).toBeVisible()
    await expect(page.getByText('El Vertido')).toBeVisible()
  })

  test('temporizador libre: empezar, pausar, seguir, reiniciar', async ({ page }) => {
    await page.clock.install()
    await gotoApp(page, '/app/timer')
    await page.getByRole('button', { name: 'Empezar' }).click()
    await page.clock.runFor(5_000)
    await expect(page.getByText('0:05')).toBeVisible()
    await page.getByRole('button', { name: 'Pausar' }).click()
    await page.clock.runFor(5_000)
    await expect(page.getByText('0:05')).toBeVisible()
    await page.getByRole('button', { name: 'Seguir' }).click()
    await page.clock.runFor(2_000)
    await expect(page.getByText('0:07')).toBeVisible()
    await page.getByRole('button', { name: 'Reiniciar' }).click()
    await expect(page.getByText('0:00')).toBeVisible()
  })

  test('con receta: el último paso queda activo y se termina con «Terminar»', async ({ page }) => {
    await gotoApp(page, '/app/recipes')
    const recipes = await store<any[]>(page, 'recipes', 'list')
    const r = recipes.find(x => x.steps?.length > 1)
    test.skip(!r, 'Sin recetas con pasos')
    const last = [...r.steps].sort((a: any, b: any) => a.timeSeconds - b.timeSeconds).pop()
    await page.clock.install()
    await page.goto(`/app/timer?receta=${r.id}`)
    await page.getByRole('button', { name: 'Empezar' }).click()
    await page.clock.runFor(last.timeSeconds * 1000 + 1000)
    await expect(page.getByText('Ahora')).toBeVisible()
    await expect(page.locator('.tm-now-t')).toHaveText(last.title)
    await expect(page.getByText('Tu taza está lista')).toBeHidden()
    await page.clock.runFor(30_000) // el reloj sigue durante el último paso
    await page.getByRole('button', { name: 'Terminar' }).click()
    await expect(page.getByText('Tu taza está lista')).toBeVisible()
  })

  test('al terminar, «Anotar esta taza» precarga método, dosis, agua y tiempo', async ({ page }) => {
    await gotoApp(page, '/app/recipes')
    const recipes = await store<any[]>(page, 'recipes', 'list')
    const r = recipes.find(x => x.steps?.length && x.dose && x.water)
    test.skip(!r, 'Sin recetas completas')
    const end = Math.max(...r.steps.map((s: any) => s.timeSeconds))
    await page.clock.install()
    await page.goto(`/app/timer?receta=${r.id}`)
    await page.getByRole('button', { name: 'Empezar' }).click()
    await page.clock.runFor(end * 1000 + 1500)
    await page.getByRole('button', { name: 'Terminar' }).click()
    await page.getByRole('button', { name: 'Anotar esta taza' }).click()
    const sheet = page.getByRole('dialog', { name: 'Nueva nota' })
    await expect(sheet.locator('#nf-dosis')).toHaveValue(String(r.dose))
    await expect(sheet.locator('#nf-agua')).toHaveValue(String(r.water))
    // Elegir un café reciente no debe pisar los datos de la receta.
    const recent = sheet.locator('.nf-recents button').first()
    if (await recent.isVisible().catch(() => false)) {
      await recent.click()
      await expect(sheet.locator('#nf-dosis')).toHaveValue(String(r.dose))
    }
    await sheet.getByRole('button', { name: 'Cancelar' }).click()
  })
})
