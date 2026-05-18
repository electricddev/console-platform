import { test } from '@playwright/test'

test('schema panel review - expanded tables + tooltip + dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/cp/analyses/new')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  // Select ACRED vault to get to the workbench
  const acredOption = page.locator('text=ACRED').first()
  if (await acredOption.isVisible()) {
    await acredOption.click()
    await page.waitForTimeout(1200)
    await page.waitForLoadState('networkidle')
  }

  // Now expand nav_latest - look for the table row and click chevron / row
  const navLatest = page.locator('text=nav_latest').first()
  if (await navLatest.isVisible()) {
    await navLatest.click()
    await page.waitForTimeout(400)
  }

  // Expand positions_snapshot
  const positionsSnapshot = page.locator('text=positions_snapshot').first()
  if (await positionsSnapshot.isVisible()) {
    await positionsSnapshot.click()
    await page.waitForTimeout(400)
  }

  await page.screenshot({ path: '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room/verify-cp-schema-reviewed-1440.png', fullPage: false })

  // Hover over par_value to get tooltip
  const parValue = page.locator('text=par_value').first()
  if (await parValue.isVisible()) {
    await parValue.hover()
    await page.waitForTimeout(700)
    await page.screenshot({ path: '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room/verify-cp-schema-reviewed-tooltip.png', fullPage: false })
  } else {
    // Fallback: hover current_nav  
    const currentNav = page.locator('text=current_nav').first()
    await currentNav.hover().catch(() => {})
    await page.waitForTimeout(700)
    await page.screenshot({ path: '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room/verify-cp-schema-reviewed-tooltip.png', fullPage: false })
  }

  // Toggle theme (dark is default, toggle to light)
  await page.evaluate(() => {
    const el = document.documentElement
    if (el.classList.contains('dark')) {
      el.classList.remove('dark')
      el.classList.add('light')
    } else {
      el.classList.add('dark')
    }
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: '/Users/douwe/Desktop/hyve/codebases/frontend/verant-data-room/verify-cp-schema-reviewed-alt-mode.png', fullPage: false })
})
