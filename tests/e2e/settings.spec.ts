import { test, expect } from '@playwright/test'

test('settings: navigate every page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, maya/i })).toBeVisible()
  await page.goto('/settings/organization')
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

  for (const slug of ['members', 'wallets', 'integrations', 'notifications', 'billing', 'security']) {
    await page.getByRole('link', { name: new RegExp(slug, 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/settings/${slug}`))
  }
})
