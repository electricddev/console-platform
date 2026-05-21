import { expect, test } from '@playwright/test'

test.describe('/sources canvas', () => {
  test('renders 6 source tiles and 12 dataset tiles from fixtures', async ({ page }) => {
    await page.goto('/sources')
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible()
    // Source tiles
    await expect(page.getByRole('button', { name: /Securitize Fund Services/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /SEC EDGAR/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /acred-archive/ })).toBeVisible()
    // Dataset tiles (link to /datasets/[id])
    await expect(page.getByRole('link', { name: /nav.daily/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /form_n_port/ })).toBeVisible()
    // Vault peripheral tiles
    await expect(page.getByRole('link', { name: /ACRED/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /TVF/ })).toBeVisible()
  })

  test('opens the catalog sheet via the floating bar and closes via Esc', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Add connector/i }).first().click()
    await expect(page.getByRole('dialog', { name: /Add a connector/i })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Add a connector/i })).not.toBeVisible()
  })

  test('inspector expands a source tile and closes via Esc', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Securitize Fund Services/ }).click()
    await expect(page.getByRole('heading', { name: 'Securitize Fund Services' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Securitize Fund Services' })).not.toBeVisible()
  })

  test('?add=s3 deep-link opens the S3 setup directly', async ({ page }) => {
    await page.goto('/sources?add=s3')
    await expect(page.getByRole('heading', { name: /Add Amazon S3/ })).toBeVisible()
  })
})
