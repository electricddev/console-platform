import { test, expect } from '@playwright/test'

test('counterparty: sign in → home → dataset → template → run', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome back, maya/i })).toBeVisible()

  // AI insights present
  await expect(page.getByText(/concentration breach predicted/i).first()).toBeVisible()

  // Navigate to a dataset
  await page.getByRole('link', { name: /datasets/i }).first().click()
  await expect(page).toHaveURL(/\/datasets/)
  await page.getByRole('link', { name: /mF-ONE/i }).click()
  await expect(page).toHaveURL(/\/datasets\/ds_mfone/)

  // Visit Schema tab
  await page.getByRole('link', { name: /schema/i }).click()
  await expect(page.getByText(/loan_id/i)).toBeVisible()

  // Open a template
  await page.getByRole('link', { name: /templates/i }).first().click()
  await page.getByRole('link', { name: /weighted advance rate/i }).first().click()
  await expect(page.getByRole('heading', { name: /weighted advance rate by sector/i })).toBeVisible()

  // Open a completed run
  await page.goto('/runs/run_4821')
  await expect(page.getByRole('heading', { name: /run_4821/i })).toBeVisible()
  await expect(page.getByText(/TEE measurement/i)).toBeVisible()
  await expect(page.getByText(/code hash/i)).toBeVisible()
})
