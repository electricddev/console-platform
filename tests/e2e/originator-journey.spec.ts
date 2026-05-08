import { test, expect } from '@playwright/test'

test('originator: home → sources → schemas → approvals → access', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo originator/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, tom/i })).toBeVisible()

  await page.getByRole('link', { name: /sources/i }).first().click()
  await expect(page.getByRole('heading', { name: /sources/i })).toBeVisible()

  await page.getByRole('link', { name: /mF-ONE Postgres/i }).click()
  await expect(page.getByText(/agent v1\.4\.2/i)).toBeVisible()

  await page.getByRole('link', { name: /schemas/i }).first().click()
  await expect(page.getByRole('heading', { name: /queryable schemas/i })).toBeVisible()

  await page.getByRole('link', { name: /approvals/i }).first().click()
  await expect(page.getByRole('heading', { name: /template approvals/i })).toBeVisible()

  await page.getByRole('link', { name: /access/i }).first().click()
  await expect(page.getByRole('heading', { name: /counterparty access/i })).toBeVisible()
})
