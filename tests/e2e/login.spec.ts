import { test, expect } from '@playwright/test'

test('Demo Counterparty sign-in lands on the home placeholder', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /welcome, maya/i })).toBeVisible()
})
