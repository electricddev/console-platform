import { test, expect, type Page } from '@playwright/test'

async function signInAsCounterparty(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.waitForURL(/\/cp/)
}

async function openWorkbench(page: Page) {
  await signInAsCounterparty(page)
  await page.goto('/cp/analyses/new?vault=acred')
  // Wait for the workbench to render.
  await expect(page.locator('[data-companion-panel]')).toBeVisible({ timeout: 5000 })
}

test.describe('companion panel', () => {
  test.beforeEach(async ({ context }) => {
    // Clear sessionStorage between tests to keep behavior deterministic.
    await context.clearCookies()
  })

  test('resizes via keyboard and persists height across reload', async ({ page }) => {
    await openWorkbench(page)

    // Ensure panel is open (click Validate to expand if collapsed).
    await page.getByRole('tab', { name: /^Validate/ }).click()

    const handle = page.getByRole('separator', { name: /resize companion panel/i })
    await handle.focus()
    // Grow the panel by 4 PageUp presses (≈ +400px).
    for (let i = 0; i < 4; i++) await page.keyboard.press('PageUp')

    const panel = page.locator('[data-companion-panel]')
    const beforeReload = await panel.boundingBox()
    expect(beforeReload).not.toBeNull()
    expect(beforeReload!.height).toBeGreaterThan(380)

    // Reload and verify height persisted.
    await page.reload()
    await expect(page.locator('[data-companion-panel]')).toBeVisible()
    // The panel starts closed after reload; open it to see the restored height.
    await page.getByRole('tab', { name: /^Validate/ }).click()
    const afterReload = await panel.boundingBox()
    expect(afterReload!.height).toBeGreaterThan(380)
  })

  test('switches between all six tabs', async ({ page }) => {
    await openWorkbench(page)
    for (const label of ['Validate', 'Dry-run', 'Tests', 'Schedule & Cost', 'Integration', 'Terminal']) {
      await page.getByRole('tab', { name: new RegExp(`^${label}`, 'i') }).click()
      await expect(
        page.getByRole('tab', { name: new RegExp(`^${label}`, 'i') }),
      ).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('Terminal CLI runs `help` and prints command listing', async ({ page }) => {
    await openWorkbench(page)
    await page.getByRole('tab', { name: /^Terminal/ }).click()
    // Switch to CLI mode (sessionStorage default is 'cli', but click to be explicit).
    await page.getByRole('tab', { name: /^CLI$/ }).click()

    const input = page.getByLabel('Terminal input')
    await input.fill('help')
    await input.press('Enter')

    await expect(page.getByText(/Run all pre-submit checks\./i)).toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/Preview output rows for the current SELECT\./i)).toBeVisible()
  })

  test('Integration tab switches between languages', async ({ page }) => {
    await openWorkbench(page)
    await page.getByRole('tab', { name: /^Integration/ }).click()

    // Default is Solidity.
    await expect(page.getByRole('tab', { name: /^Solidity$/ })).toHaveAttribute('aria-selected', 'true')

    // Switch to Python.
    await page.getByRole('tab', { name: /^Python$/ }).click()
    await expect(page.getByRole('tab', { name: /^Python$/ })).toHaveAttribute('aria-selected', 'true')

    // The code panel should contain a Python-style line.
    // Shiki rendering may take a moment; check for 'from hyve import' which appears in both highlighted and fallback.
    await expect(page.getByText(/from hyve import HyveClient/i)).toBeVisible({ timeout: 3000 })
  })
})
