import { test, expect } from '@playwright/test'

test('explore: ACRED is discoverable, queryable, and exportable', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text())
  })

  // Sign in via demo counterparty persona
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  // Wait for redirect to the authenticated home page (heading contains "Maya")
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()

  // Navigate to ACRED dataset overview
  await page.goto('/datasets/ds_acred')
  await expect(page.getByRole('heading', { name: /ACRED/i })).toBeVisible()

  // Explore tab exists (dataset-derived, only present for parquet-backed datasets)
  const exploreLink = page.getByRole('link', { name: /^Explore$/ })
  await expect(exploreLink).toBeVisible()
  await exploreLink.click()
  await expect(page).toHaveURL(/\/datasets\/ds_acred\/explore/)

  // Wait for DuckDB to initialise — loading state disappears and table rows appear
  // Default table is fund_overview (first in descriptor array)
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30_000 })

  // Switch to Holdings table via the TablePicker
  await page.getByRole('button', { name: /^Holdings/i }).click()

  // Wait for the holdings grid to populate (11,769 rows)
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30_000 })
  const firstRowCount = await page.locator('table tbody tr').count()
  expect(firstRowCount).toBeGreaterThan(0)

  // Sort by the first sortable header — click twice to go asc → desc
  // Holdings columns: period_end_date, accession_number, borrower_normalized, borrower_lei,
  // borrower_cusip, borrower_isin, investment_type, asset_category, industry, geography,
  // principal_amount, fair_value, coupon_rate, coupon_kind, maturity_date, days_to_maturity,
  // is_non_accrual, is_default  (borrower_raw_name is hidden)
  const firstSortButton = page.locator('table thead button[aria-label^="Sort by"]').first()
  await expect(firstSortButton).toBeVisible()
  await firstSortButton.click()
  await firstSortButton.click()

  // Apply a numeric filter using the "Fair value" column filter to exclude all rows
  // (Fair value is a currency/numeric column, which renders the Min/Max widget)
  const fairValueFilterButton = page.locator('table thead button[aria-label="Filter Fair value"]')
  if (await fairValueFilterButton.isVisible()) {
    await fairValueFilterButton.click()
    const minInput = page.getByPlaceholder('Min')
    await expect(minInput).toBeVisible({ timeout: 5_000 })
    await minInput.fill('999999999')
    await page.getByRole('button', { name: /^Apply$/ }).click()

    // Grid should show empty state
    await expect(page.getByText(/No rows match these filters/i)).toBeVisible({ timeout: 15_000 })

    // Clear filters button is shown inside the EmptyState component
    await page.getByRole('button', { name: /^Clear filters$/ }).click()

    // Rows return after clearing
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
  } else {
    // Fallback: try any numeric column's filter
    const anyFilterButton = page.locator('table thead button[aria-label^="Filter"]').first()
    if (await anyFilterButton.isVisible()) {
      await anyFilterButton.click()
      const minInput = page.getByPlaceholder('Min')
      if (await minInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await minInput.fill('999999999')
        await page.getByRole('button', { name: /^Apply$/ }).click()
        await expect(page.getByText(/No rows match these filters/i)).toBeVisible({ timeout: 15_000 })
        await page.getByRole('button', { name: /^Clear filters$/ }).click()
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
      } else {
        // Close popover by pressing Escape if it's not a numeric column
        await page.keyboard.press('Escape')
      }
    }
  }

  // Focus a column in the profile panel — click the ⌕ button on the first column
  // aria-label is "Focus column ${col.label} in profile panel"
  const firstFocusButton = page
    .locator('table thead button[aria-label^="Focus column"]')
    .first()
  if (await firstFocusButton.isVisible()) {
    await firstFocusButton.click()
    // ColumnProfilePanel shows "Distinct" and "Nulls" stats once profiling completes
    await expect(page.getByText(/Distinct/i)).toBeVisible({ timeout: 15_000 })
  }

  // CSV export — Playwright captures the download event triggered by the anchor click
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export CSV/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/holdings\.csv$/)

  // Descriptor drift guard: no [descriptor-drift] warnings during the entire test run
  expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toHaveLength(0)
})
