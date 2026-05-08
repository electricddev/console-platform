import { test, expect } from '@playwright/test'

test('Next dev server responds', async ({ page }) => {
  const response = await page.goto('/')
  // Either a real page (200) or a redirect; either is fine for init.
  expect(response?.status()).toBeLessThan(500)
})
