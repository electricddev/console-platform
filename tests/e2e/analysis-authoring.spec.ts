import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const SS_DIR = '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room'

async function signInAsCounterparty(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.waitForURL(/\/cp/)
}

test.describe('analysis authoring flow', () => {
  test('step 1: /cp/analyses/new shows vault picker dialog when no vault param', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Choose a vault to author against')).toBeVisible()
    await page.screenshot({ path: path.join(SS_DIR, 'ss-1-vault-picker.png'), fullPage: false })
  })

  test('step 2: clicking ACRED shows workbench', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new')
    // Click the ACRED vault
    await page.getByRole('button', { name: /ACRED/i }).first().click()
    // Picker should close and workbench should render — check header strip
    await expect(page.getByPlaceholder('analysis_name')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: path.join(SS_DIR, 'ss-2-workbench.png'), fullPage: false })
  })

  test('step 3: fill form — taken name, schema field click, cron trigger, destination', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new?vault=acred')
    await expect(page.getByPlaceholder('analysis_name')).toBeVisible({ timeout: 5000 })

    // Try a taken name — "acred_advance_rate" is an existing analysis name
    const nameInput = page.getByPlaceholder('analysis_name')
    await nameInput.fill('acred_advance_rate')
    // Should show "taken" helper (the specific header text, not the drawer validation)
    await expect(page.getByText('taken — try')).toBeVisible({ timeout: 3000 })

    // Now use a unique name
    await nameInput.fill('acred_advance_rate_new')

    // Click a schema field (nav_latest → current_nav visible on xl screens)
    // The schema panel is hidden on smaller viewports; expand viewport first
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.reload()
    await page.goto('/cp/analyses/new?vault=acred')
    await expect(page.getByPlaceholder('analysis_name')).toBeVisible({ timeout: 5000 })
    await nameInput.fill('acred_advance_rate_new')

    // Click on current_nav field in schema browser
    const currentNavField = page.getByRole('button', { name: /current_nav/i }).first()
    if (await currentNavField.isVisible()) {
      await currentNavField.click()
    }

    // Set trigger to cron "every hour" preset
    await page.getByRole('button', { name: /every hour/i }).click()

    // Add an ETH destination
    await page.getByRole('button', { name: /Add/i }).first().click()
    // Select On-chain (should be default)
    await expect(page.getByText('On-chain')).toBeVisible()
    // ETH is default, type an address
    await page.getByPlaceholder('0x...').fill('0x7f268357A8c2552623316e2562D90e642bB538E5')
    await page.getByRole('button', { name: /^Add$/ }).last().click()

    await page.screenshot({ path: path.join(SS_DIR, 'ss-3-workbench-filled.png'), fullPage: false })
  })

  test('step 4: submit drawer opens', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/cp/analyses/new?vault=acred')
    await expect(page.getByPlaceholder('analysis_name')).toBeVisible({ timeout: 5000 })

    // Fill a unique name
    await page.getByPlaceholder('analysis_name').fill('acred_my_new_analysis')

    // Set trigger
    await page.getByRole('button', { name: /every hour/i }).click()

    // Add a destination
    await page.getByRole('button', { name: /Add/i }).first().click()
    await page.getByPlaceholder('0x...').fill('0x7f268357A8c2552623316e2562D90e642bB538E5')
    await page.getByRole('button', { name: /^Add$/ }).last().click()

    // Click "Submit for review"
    await page.getByRole('button', { name: /Submit for review/i }).click()
    await expect(page.getByRole('dialog', { name: /Submit proposal to/i })).toBeVisible({ timeout: 3000 })
    await page.screenshot({ path: path.join(SS_DIR, 'ss-4-drawer.png'), fullPage: false })
  })

  test('step 5: submit redirects to analyses with success banner', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/cp/analyses/new?vault=acred')
    await expect(page.getByPlaceholder('analysis_name')).toBeVisible({ timeout: 5000 })

    await page.getByPlaceholder('analysis_name').fill('acred_my_new_analysis')
    await page.getByRole('button', { name: /every hour/i }).click()

    // Add destination
    await page.getByRole('button', { name: /Add/i }).first().click()
    await page.getByPlaceholder('0x...').fill('0x7f268357A8c2552623316e2562D90e642bB538E5')
    await page.getByRole('button', { name: /^Add$/ }).last().click()

    // Open drawer and submit
    await page.getByRole('button', { name: /Submit for review/i }).click()
    await page.getByRole('button', { name: /Submit proposal/i }).click()

    // Should redirect to /cp/analyses?submitted=...
    await page.waitForURL(/\/cp\/analyses/, { timeout: 5000 })
    await expect(page.getByText('Proposal submitted')).toBeVisible({ timeout: 3000 })
    await page.screenshot({ path: path.join(SS_DIR, 'ss-5-success-banner.png'), fullPage: false })
  })
})
