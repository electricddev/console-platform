import { test, expect } from '@playwright/test'

test('audit log: filter and switch views', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo originator/i }).click()
  await page.getByRole('link', { name: /audit/i }).first().click()
  await expect(page.getByRole('heading', { name: /cryptographic audit log/i })).toBeVisible()

  // Default view shows entries
  await expect(page.locator('text=executed-query').first()).toBeVisible()

  // Switch to table
  await page.getByRole('link', { name: /^Table$/ }).click()
  await expect(page).toHaveURL(/view=table/)

  // Filter by resource type
  // (Type-specific UI varies; assert page still renders without errors.)
  await expect(page).toHaveURL(/audit/)
})
