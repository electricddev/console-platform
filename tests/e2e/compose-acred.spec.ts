import { test, expect } from '@playwright/test'

test('compose: build an ACRED methodology notebook and view live results', async ({ page }) => {
  // Sign in as the demo counterparty (author of new notebooks).
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome back, maya/i })).toBeVisible()

  // Create a fresh notebook.
  await page.goto('/notebooks/new')
  await page.getByLabel('Title').fill('ACRED methodology test')
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page).toHaveURL(/\/notebooks\/nb_/)
  const notebookUrl = page.url()

  // Open compose via Edit.
  await page.getByRole('link', { name: /^edit$/i }).click()
  await expect(page).toHaveURL(/\/compose$/)
  // Methodology sidebar is present
  await expect(page.getByText(/methodology/i).first()).toBeVisible()

  // Add 4 methodology cells using the sidebar buttons.
  // Buttons contain title + shape as two text nodes — match on the title text.
  await page.getByRole('button', { name: /NAV over time/i }).first().click()       // time-series
  await page.getByRole('button', { name: /current vs 12mo ago/i }).first().click() // comparison
  await page.getByRole('button', { name: /Top-10 borrower exposure/i }).first().click() // breakdown
  await page.getByRole('button', { name: /First-lien % of book/i }).first().click()     // metric

  // Wait for each result to render. time-series: an svg with a path.
  await expect(page.locator('svg path').first()).toBeVisible({ timeout: 30_000 })
  // breakdown / metric: their labels show up in the cell list.
  await expect(page.getByText(/top.?10 borrower/i).first()).toBeVisible()
  await expect(page.getByText(/first-lien/i).first()).toBeVisible()

  // Save — button is enabled only when dirty, becomes disabled once save completes.
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByRole('button', { name: /^save(ing)?/i })).toBeDisabled({ timeout: 10_000 })

  // Navigate to viewer via the View link.
  await page.getByRole('link', { name: /^view$/i }).click()
  await expect(page).toHaveURL(notebookUrl)

  // Live results render on the viewer.
  await expect(page.locator('svg path').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/NAV over time/i).first()).toBeVisible()
  await expect(page.getByText(/Top-10 borrower exposure/i).first()).toBeVisible()
  await expect(page.getByText(/First-lien % of book/i).first()).toBeVisible()

  // Ensure no methodology DSL produced an error.
  await expect(page.getByText(/^Error: /).first()).toBeHidden()
})
