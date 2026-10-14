import { test, expect } from '@playwright/test'
import { cleanupQa, gotoApp, openNoteSheet, qaName, store } from './helpers'

test.describe('Nota rápida', () => {
  test.afterAll(async ({ browser }, info) => {
    const page = await browser.newPage({ storageState: info.project.use.storageState as string })
    await gotoApp(page)
    await cleanupQa(page)
    await page.close()
  })

  test('café nuevo + puntaje + sabores + receta → detalle y Firestore', async ({ page }) => {
    const name = qaName('Geisha')
    await gotoApp(page)
    const sheet = await openNoteSheet(page)
    const save = sheet.getByRole('button', { name: 'Guardar nota' })

    await expect(save).toBeDisabled()
    await expect(sheet.getByText('Escribe el café y elige un puntaje')).toBeVisible()

    await sheet.locator('#nf-cafe').fill(name)
    await expect(sheet.getByText('Café nuevo · se añade a Mis cafés al guardar')).toBeVisible()
    await sheet.locator('#nf-marca').fill('QA-E2E Tostadores')
    await expect(sheet.getByText('Elige un puntaje para guardar')).toBeVisible()

    await sheet.getByRole('button', { name: /4\s*Muy rico/ }).click()
    await sheet.getByRole('button', { name: 'Cereza' }).click()
    await sheet.getByRole('button', { name: '+ Otro' }).click()
    await sheet.getByLabel('Nuevo sabor').fill('Jazmín')
    await sheet.getByLabel('Nuevo sabor').press('Enter')

    await sheet.getByText('Más detalles').click()
    const recipeChip = sheet.locator('.nf-more-b .nf-hwrap button').first()
    const hasRecipe = await recipeChip.isVisible().catch(() => false)
    const recipeName = hasRecipe ? (await recipeChip.innerText()).trim() : null
    if (hasRecipe) await recipeChip.click()

    const sw = sheet.getByRole('switch')
    if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click()

    await save.click()
    await expect(page).toHaveURL(/\/app\/tastings\/\w+/)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('muy rico')).toBeVisible()

    const id = page.url().split('/').pop()!
    const list = await store<any[]>(page, 'tastings', 'list')
    const t = list.find(x => x.id === id)
    expect(t.ratingOverall).toBe(8)
    expect(t.flavorNotes).toEqual(['Cereza', 'Jazmín'])
    expect(t.visibility).toBe('friends')
    if (recipeName) expect(t.recipeName).toBe(recipeName)

    const coffees = await store<any[]>(page, 'coffees', 'list')
    expect(coffees.some(c => c.name === name)).toBe(true)
  })

  test('compartir apagado → privada, y la elección se recuerda', async ({ page }) => {
    const name = qaName('Privada')
    await gotoApp(page)
    let sheet = await openNoteSheet(page)
    await sheet.locator('#nf-cafe').fill(name)
    await sheet.getByRole('button', { name: /3\s*Rico/ }).click()
    const sw = sheet.getByRole('switch')
    if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click()
    await sheet.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page).toHaveURL(/\/app\/tastings\/\w+/)
    const id = page.url().split('/').pop()!
    const t = (await store<any[]>(page, 'tastings', 'list')).find(x => x.id === id)
    expect(t.visibility).toBe('private')
    expect(t.sharedWith ?? []).toEqual([])
    await expect(page.getByText('Solo tú la ves')).toBeVisible()

    sheet = await openNoteSheet(page)
    await expect(sheet.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    await sheet.getByRole('switch').click() // deja el valor por defecto
    await sheet.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('Repetir precarga el café y «como la última vez»', async ({ page }) => {
    const name = qaName('Repetir')
    await gotoApp(page)
    const sheet = await openNoteSheet(page)
    await sheet.locator('#nf-cafe').fill(name)
    await sheet.getByRole('button', { name: /5\s*Wow/ }).click()
    await sheet.getByText('Más detalles').click()
    await sheet.getByRole('button', { name: 'Chemex' }).click()
    await sheet.locator('#nf-dosis').fill('18')
    await sheet.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page).toHaveURL(/\/app\/tastings\/\w+/)

    await page.getByRole('button', { name: 'Repetir' }).click()
    const again = page.getByRole('dialog', { name: 'Nueva nota' })
    await expect(again.locator('#nf-cafe')).toHaveValue(name)
    await expect(again.getByText(/Chemex · 18 g · como la última vez/)).toBeVisible()
  })

  test('ruta /app/tastings/new?coffeeId= precarga «como la última vez» en carga en frío', async ({ page }) => {
    test.fail(true, 'BUG: el watch de match.id (Form.vue) corre antes de que carguen las notas')
    const coffees = await (async () => { await gotoApp(page); return store<any[]>(page, 'coffees', 'list') })()
    const tastings = await store<any[]>(page, 'tastings', 'list')
    const withNote = coffees.find(c => tastings.some(t => t.coffeeId === c.id && t.brewMethod))
    test.skip(!withNote, 'La cuenta no tiene cafés con notas')
    await page.goto(`/app/tastings/new?coffeeId=${withNote.id}`)
    await expect(page.locator('#nf-cafe')).toHaveValue(withNote.name)
    await expect(page.getByText(/como la última vez/)).toBeVisible()
  })

  test('la fila «Recientes» es visible al abrir la hoja', async ({ page }) => {
    await gotoApp(page)
    const tastings = await store<any[]>(page, 'tastings', 'list')
    test.skip(!tastings.length, 'Sin notas no hay recientes')
    const sheet = await openNoteSheet(page)
    const row = sheet.locator('.nf-recents')
    await expect(row).toBeVisible()
    expect((await row.boundingBox())!.height).toBeGreaterThan(20)
  })
})
