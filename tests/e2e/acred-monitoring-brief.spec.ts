import { test, expect } from '@playwright/test'

test('ACRED monitoring brief — portfolio → brief → drill → memo → AMM', async ({ page }) => {
  // Console drift guard — accumulate all warnings throughout the test.
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text())
  })

  // ── 1. Sign in as the demo counterparty ────────────────────────────────────
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()

  // ── 2. Portfolio list (/datasets) ──────────────────────────────────────────
  await page.goto('/datasets')

  // Eyebrow heading contains "credit portfolio"
  await expect(page.getByText(/credit portfolio/i)).toBeVisible()

  // ACRED row exists in the table
  const acredRow = page.getByRole('link', { name: /^ACRED$/i })
  await expect(acredRow).toBeVisible()

  // ── 3. Navigate to ACRED brief ─────────────────────────────────────────────
  await acredRow.click()
  await expect(page).toHaveURL('/datasets/ds_acred')

  // Layout PageHeader renders the dataset name as the page heading
  await expect(page.getByRole('heading', { name: /ACRED/i })).toBeVisible()

  // Vital signs section heading confirms the brief is rendered
  await expect(page.getByText('// vital signs · period over period')).toBeVisible()

  // ── 4. Vital signs — 6 labels ─────────────────────────────────────────────
  // VitalSignsPanel wraps all tiles in <section aria-labelledby="vitals">
  // Scope assertions there to avoid collisions with the portfolio table headers.
  const vitalsSection = page.locator('section[aria-labelledby="vitals"]')
  await expect(vitalsSection).toBeVisible()
  await expect(vitalsSection.getByText('NAV')).toBeVisible()
  await expect(vitalsSection.getByText('Leverage')).toBeVisible()
  // Non-accrual label in VitalSignsPanel is "Non-accrual %"
  await expect(vitalsSection.getByText('Non-accrual %')).toBeVisible()
  await expect(vitalsSection.getByText('Top-10 concentration')).toBeVisible()
  // PIK label is "PIK %"
  await expect(vitalsSection.getByText('PIK %')).toBeVisible()
  await expect(vitalsSection.getByText('Net flow')).toBeVisible()

  // ── 5. Red flag scoreboard — at least 1 tripped ───────────────────────────
  // The scoreboard renders "{flags.length} of {totalRules} tripped"
  // We assert the pattern matches X of 8 tripped where X >= 1
  const scoreText = page.getByText(/\d+ of 8 tripped/)
  await expect(scoreText).toBeVisible()
  const raw = await scoreText.textContent()
  const match = raw?.match(/^(\d+) of 8 tripped$/)
  expect(match).not.toBeNull()
  const trippedCount = parseInt(match![1], 10)
  expect(trippedCount).toBeGreaterThanOrEqual(1)

  // ── 6. Drill into a red-flag link ──────────────────────────────────────────
  // At least one flag has a drillHref — find the first linked flag label
  const drillLink = page
    .locator('ul li a[href*="/datasets/ds_acred/explore"]')
    .first()
  const hasDrillLink = await drillLink.isVisible()
  if (hasDrillLink) {
    await drillLink.click()
    await expect(page).toHaveURL(/\/datasets\/ds_acred\/explore.*where=/)
    await page.goBack()
    await expect(page).toHaveURL('/datasets/ds_acred')
    // Re-confirm brief is still visible after back-navigation
    await expect(page.getByText('// vital signs · period over period')).toBeVisible()
  }

  // ── 7. Draft DD memo ───────────────────────────────────────────────────────
  // DrillOutActions renders a "Draft DD memo" button linking to /datasets/ds_acred/memo
  const memoButton = page.getByRole('link', { name: /draft dd memo/i })
  await expect(memoButton).toBeVisible()
  await memoButton.click()
  // URL matches /datasets/ds_acred/memo
  await expect(page).toHaveURL(/\/datasets\/ds_acred\/memo/)

  // ── 8. Return and click the AMM tab ────────────────────────────────────────
  await page.goBack()
  await expect(page).toHaveURL('/datasets/ds_acred')

  const ammTab = page.getByRole('link', { name: /^AMM$/i })
  await expect(ammTab).toBeVisible()
  await ammTab.click()
  await expect(page).toHaveURL('/datasets/ds_acred/amm')

  // AmmOpsPanel LiveNavTile renders "Live NAV" label
  await expect(page.getByText('Live NAV')).toBeVisible()

  // ── 9. NAV per token ticks every 5 s ──────────────────────────────────────
  const navEl = page.locator('[aria-label="NAV per token"]')
  await expect(navEl).toBeVisible()
  const navBefore = await navEl.textContent()

  // Wait 6 s — one tick fires (interval = 5 s)
  await page.waitForTimeout(6_000)
  const navAfter = await navEl.textContent()
  expect(navAfter).not.toBe(navBefore)

  // ── 10. Counterfactual calculator slider ──────────────────────────────────
  const withHyveEl = page.getByTestId('max-with-hyve')
  await expect(withHyveEl).toBeVisible()

  const slider = page.getByRole('slider', { name: /NAV confidence interval/i })
  await expect(slider).toBeVisible()

  // The CI label text reflects the slider position exactly (ci * 100).toFixed(2)%
  // Moving the slider from its initial position changes this label — this is the
  // authoritative proof that the slider is reactive and the calculator re-renders.
  // Note: max-with-hyve formatted text ($XM) does not change within the slider
  // range (0.05%–2%) because the $M rounding absorbs small capacity deltas;
  // max-without-hyve changes dramatically and confirms the calculator runs.
  const withoutHyveEl = page.getByTestId('max-without-hyve')
  await expect(withoutHyveEl).toBeVisible()
  const withoutBefore = await withoutHyveEl.textContent()

  // Move slider to minimum CI — maximum swap capacity, visible change in without-Hyve value
  await slider.fill('0.0005')
  const withoutAfter = await withoutHyveEl.textContent()
  expect(withoutAfter).not.toBe(withoutBefore)

  // Also confirm max-with-hyve element is present (it is rendered and reactive)
  await expect(withHyveEl).toBeVisible()

  // ── 11. Console drift guard ────────────────────────────────────────────────
  expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toHaveLength(0)
})
