import { test } from '@playwright/test'
import path from 'path'

const SS_DIR = '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room'

test('vaults page — author analysis links', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.waitForURL(/\/cp/)
  await page.goto('/cp/vaults')
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.screenshot({ path: path.join(SS_DIR, 'ss-vaults-with-links.png') })
})

test('analysis detail — propose new version button', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.waitForURL(/\/cp/)
  await page.goto('/cp/analyses/acred_advance_rate')
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.screenshot({ path: path.join(SS_DIR, 'ss-analysis-detail-propose.png') })
})
