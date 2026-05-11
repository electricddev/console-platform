import { test, expect } from '@playwright/test'

test.describe('Foundation smoke', () => {
  test('login → home → ⌘K palette → close', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)

    await page.getByRole('button', { name: /demo counterparty/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /welcome back, maya/i })).toBeVisible()

    // Sidebar shows counterparty items
    await expect(page.getByRole('link', { name: /datasets/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /templates/i })).toBeVisible()

    // ⌘K opens the palette
    await page.keyboard.press('Meta+k')
    await expect(page.getByPlaceholder(/search datasets, templates, runs/i)).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
  })

  test('signed-in originator sees originator-only nav', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo originator/i }).click()
    const sidebar = page.getByRole('complementary', { name: /primary navigation/i })
    await expect(sidebar.getByRole('link', { name: 'Sources', exact: true })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Approvals', exact: true })).toBeVisible()
  })

  test('signing out returns to /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo counterparty/i }).click()
    await page.getByRole('button', { name: /account menu/i }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('404 renders for unknown routes (after sign-in)', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo counterparty/i }).click()
    // Wait for the server action redirect to complete before navigating away
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
  })
})
