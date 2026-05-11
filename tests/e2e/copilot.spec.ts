import { test, expect } from '@playwright/test'

test('copilot: send a message and see streaming reply', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome back, maya/i })).toBeVisible()
  await page.getByRole('link', { name: /copilot/i }).first().click()
  const composer = page.getByPlaceholder(/ask anything/i)
  await composer.fill('Is mF-ONE in concentration breach?')
  await composer.press('Enter')
  await expect(page.locator('text=Industrials').first()).toBeVisible({ timeout: 8000 })
})
