import { test, expect } from '@playwright/test'

test('notebooks: open existing memo and see attested cells', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, maya/i })).toBeVisible()
  await page.goto('/notebooks/nb_q2_credit_memo')
  await expect(page.getByRole('heading', { name: /q2 2026 mF-ONE credit memo/i })).toBeVisible()
  await expect(page.getByText(/cryptographic appendix/i)).toBeVisible()
})
