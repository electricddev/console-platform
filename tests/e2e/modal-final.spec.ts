/**
 * Final screenshot set for modal redesign.
 * Produces modal-final-<step>-<mode>.png
 */
import { test } from '@playwright/test'

async function setLight(page: import('@playwright/test').Page) {
  await page.evaluate(() => { document.documentElement.classList.remove('dark') })
  await page.waitForTimeout(150)
}

async function openPicker(page: import('@playwright/test').Page) {
  await page.goto('/sources', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /connect a source/i }).first().click()
  await page.waitForTimeout(500)
}

async function goToAuth(page: import('@playwright/test').Page, provider = 'Stripe') {
  await openPicker(page)
  await page.getByRole('button', { name: provider }).click()
  await page.waitForTimeout(500)
}

async function goToBridge(page: import('@playwright/test').Page) {
  await goToAuth(page)
  await page.getByRole('button', { name: /sign in with stripe/i }).click()
  await page.waitForTimeout(500)
}

async function goToTrust(page: import('@playwright/test').Page) {
  await goToBridge(page)
  await page.getByRole('button', { name: 'Approve →' }).click()
  await page.waitForTimeout(500)
}

async function goToDiscover(page: import('@playwright/test').Page) {
  await goToTrust(page)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(500)
}

async function goToConfirm(page: import('@playwright/test').Page) {
  await goToDiscover(page)
  // Wait for Stripe discovery to complete (~3.6s)
  await page.waitForTimeout(4000)
}

async function goToDone(page: import('@playwright/test').Page) {
  await goToConfirm(page)
  await page.getByRole('button', { name: /connect stripe/i }).click()
  await page.waitForTimeout(1500)
}

test.describe('modal final screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  // ── DARK MODE ──
  test('picker dark', async ({ page }) => {
    await openPicker(page)
    await page.screenshot({ path: 'modal-final-picker-dark.png' })
  })

  test('auth-oauth dark', async ({ page }) => {
    await goToAuth(page)
    await page.screenshot({ path: 'modal-final-auth-oauth-dark.png' })
  })

  test('bridge dark', async ({ page }) => {
    await goToBridge(page)
    await page.screenshot({ path: 'modal-final-bridge-dark.png' })
  })

  test('trust dark', async ({ page }) => {
    await goToTrust(page)
    await page.screenshot({ path: 'modal-final-trust-dark.png' })
  })

  test('discover dark', async ({ page }) => {
    await goToDiscover(page)
    await page.screenshot({ path: 'modal-final-discover-dark.png' })
  })

  test('confirm dark', async ({ page }) => {
    await goToConfirm(page)
    await page.screenshot({ path: 'modal-final-confirm-dark.png' })
  })

  test('done dark', async ({ page }) => {
    await goToDone(page)
    await page.screenshot({ path: 'modal-final-done-dark.png' })
  })

  // ── LIGHT MODE ──
  test('picker light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-picker-light.png' })
  })

  test('auth-oauth light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-auth-oauth-light.png' })
  })

  test('auth-form light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Amazon S3' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-auth-form-light.png' })
  })

  test('auth-form dark', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Amazon S3' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-auth-form-dark.png' })
  })

  test('bridge light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /sign in with stripe/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-bridge-light.png' })
  })

  test('trust light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /sign in with stripe/i }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Approve →' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'modal-final-trust-light.png' })
  })

  test('discover light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /sign in with stripe/i }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Approve →' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'modal-final-discover-light.png' })
  })

  test('confirm light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /sign in with stripe/i }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Approve →' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(4500)
    await page.screenshot({ path: 'modal-final-confirm-light.png' })
  })

  test('done light', async ({ page }) => {
    await page.goto('/sources', { waitUntil: 'networkidle' })
    await setLight(page)
    await page.getByRole('button', { name: /connect a source/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Stripe' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /sign in with stripe/i }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Approve →' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(4500)
    await page.getByRole('button', { name: /connect stripe/i }).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'modal-final-done-light.png' })
  })
})
