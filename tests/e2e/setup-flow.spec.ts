import { test } from '@playwright/test'

test('full S3 setup flow: catalog → auth → discovery → select', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/sources')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/test-00-sources.png' })

  // Open catalog sheet
  await page.click('button:has-text("+ Add connector")')
  await page.waitForTimeout(600)

  // Switch to Storage category
  await page.click('[role="dialog"] nav button:has-text("Storage")')
  await page.waitForTimeout(300)

  // Trigger S3 selection via JS (card sits under sidebar nav)
  await page.evaluate(() => {
    const btn = document.querySelector('[role="dialog"] button[aria-label="Connect Amazon S3"]') as HTMLButtonElement | null
    btn?.click()
  })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '/tmp/test-02-s3-auth-step.png' })

  // Fill S3 auth form
  await page.fill('input[placeholder*="acred"]', 'my-test-bucket')
  await page.selectOption('select', 'us-east-1')
  await page.fill('input[placeholder*="AKIA"]', 'AKIAIOSFODNN7EXAMPLE')
  await page.fill('input[type="password"]', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
  await page.screenshot({ path: '/tmp/test-03-s3-auth-filled.png' })

  // Click Continue
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/test-04-discovery-step.png' })

  // Wait for discovery to complete
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '/tmp/test-05-select-step.png' })
})
