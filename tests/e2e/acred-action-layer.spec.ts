import { test, expect } from '@playwright/test'

// Both tests share in-memory server state (memos, channels, rules). Run serially
// so they don't interfere with each other when the worker count is >1.
test.describe.configure({ mode: 'serial' })

test('action layer: brief decisions + memo + issuers + alerts', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text())
  })

  // ── 1. Sign in as demo counterparty ───────────────────────────────────────
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()

  // ── 2. Navigate to ACRED brief ─────────────────────────────────────────────
  await page.goto('/datasets/ds_acred')
  // Wait for the red-flag scoreboard to render (the "X of 8 tripped" counter).
  await expect(page.getByText(/\d+ of 8 tripped/)).toBeVisible()

  // ── 3. Acknowledge a red flag (if any are tripped) ────────────────────────
  // When all flags have been acknowledged from prior in-memory state, the list
  // is empty. The Acknowledge button only appears when flags are tripped.
  const ackButton = page.getByRole('button', { name: /^Acknowledge$/i }).first()
  const hasTrippedFlags = await ackButton.isVisible({ timeout: 1_000 }).catch(() => false)
  if (hasTrippedFlags) {
    await ackButton.click()

    // The ack form expands with a textarea (aria-label="note") and a Save button.
    const noteTextarea = page.getByLabel('note').first()
    await expect(noteTextarea).toBeVisible()
    await noteTextarea.fill('IC accepts the elevated leverage profile.')

    const saveButton = page.getByRole('button', { name: /^Save$/i }).first()
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // Brief transitions back to idle state (ack form closes).
    await page.waitForTimeout(800)
  }

  // ── 4. Set a threshold via slider (optional — only if a slider-eligible flag
  //       remains visible after the ack above) ─────────────────────────────────
  const setThresholdButton = page.getByRole('button', { name: /^Set threshold$/i }).first()
  const hasThreshold = await setThresholdButton.isVisible({ timeout: 500 }).catch(() => false)
  if (hasThreshold) {
    await setThresholdButton.click()
    // ThresholdSliderPopover renders a range input with aria-label="{metric} threshold"
    const slider = page.getByRole('slider').first()
    await expect(slider).toBeVisible()
    await slider.evaluate((el: HTMLInputElement) => {
      // Move to 80% of the slider's range as a representative value.
      const min = parseFloat(el.min)
      const max = parseFloat(el.max)
      el.value = String(min + (max - min) * 0.8)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByRole('button', { name: /Save threshold/i }).click()
  }

  // ── 5. Navigate to Memo tab ────────────────────────────────────────────────
  // The dataset layout renders tab links; the Memo tab is present only for ds_acred.
  await page.getByRole('link', { name: /^Memo$/i }).click()
  await expect(page).toHaveURL(/\/datasets\/ds_acred\/memo/)
  // At least the "Character" section heading should be visible.
  await expect(page.getByRole('heading', { name: /^Character$/i })).toBeVisible()

  // Check memo status — if already submitted (from a prior in-memory state),
  // skip the write/insert steps which are gated behind readOnly.
  const alreadySubmitted = await page.getByText('Submitted for IC review').first().isVisible().catch(() => false)
  const alreadyApproved  = await page.getByText('Approved').first().isVisible().catch(() => false)
  const isDraft = !alreadySubmitted && !alreadyApproved

  if (isDraft) {
    // ── 6. Fill the Character section ─────────────────────────────────────────
    // MemoSectionShell wraps each 5C section in <section>. Each section contains
    // a heading element with the section name. Scope by heading text.
    const characterSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Character', exact: true }) })
    const characterTextarea = characterSection.locator('textarea').first()
    await expect(characterTextarea).toBeVisible()
    await characterTextarea.fill('Apollo has a strong track record in direct lending.')
    // Wait for autosave to complete: "Saving…" appears while the server action runs,
    // then reverts to "Auto-saves after a pause." Once gone, it's safe to interact again.
    await expect(page.getByText('Auto-saves after a pause.').first()).toBeVisible({ timeout: 5_000 })

    // ── 7. Insert data into Capital section ───────────────────────────────────
    // MemoInsertPicker renders an "Insert data" button per section (except Character
    // which has no candidates). Scope to the Capital section.
    const capitalSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Capital', exact: true }) })
    const insertButton = capitalSection.getByRole('button', { name: /Insert data/i })
    await expect(insertButton).toBeVisible()
    await insertButton.click()

    // The picker dropdown shows methodology titles as buttons.
    // "Top-10 borrower exposure" maps to acred.top10_borrowers in the Capital candidates.
    const insertItem = page.getByRole('button', { name: /Top-10 borrower exposure/i })
    await expect(insertItem).toBeVisible()
    await insertItem.click()

    // After insertion the picker closes; the server action + revalidatePath triggers
    // a page re-render where MemoInsertBlock renders the methodology title.
    await expect(page.getByText(/Top-10 borrower exposure/i).first()).toBeVisible({ timeout: 10_000 })

    // ── 8. Submit memo for IC review ──────────────────────────────────────────
    // MemoStatusBar shows "Submit for IC review" when status is draft and user is not originator.
    await page.getByRole('button', { name: /Submit for IC review/i }).click()
  }

  // Status label should read "Submitted for IC review" (either from this run or a prior one).
  await expect(page.getByText('Submitted for IC review').first()).toBeVisible()

  // ── 9. Issuers list → Apollo detail ───────────────────────────────────────
  await page.goto('/issuers')
  // IssuerTable renders org names as links. Apollo is id=org_apollo, name="Apollo".
  const apolloLink = page.getByRole('link', { name: /^Apollo$/i })
  await expect(apolloLink).toBeVisible()
  await apolloLink.click()
  await expect(page).toHaveURL(/\/issuers\/org_apollo/)

  // ── 10. Submit an attestation request ─────────────────────────────────────
  // IssuerActionPanel shows "Request weekly leverage attestation" button.
  await page.getByRole('button', { name: /Request weekly leverage attestation/i }).click()
  // Form expands — click "Submit request".
  await page.getByRole('button', { name: /Submit request/i }).click()
  // IssuerRequestLog re-renders; a row with "attestation-request" kind should appear.
  await expect(page.getByText(/attestation.request/i).first()).toBeVisible()

  // ── 11. Alerts channels page — add a channel ──────────────────────────────
  await page.goto('/alerts/channels')
  // AlertChannelForm uses plain <label><span>Label</span> with a bare <input>.
  // The form renders Kind/Label/Target inputs in a grid; scope by label text.
  const labelInput = page.locator('label').filter({ hasText: /^Label$/ }).locator('input')
  await expect(labelInput).toBeVisible()
  await labelInput.fill('risk-team')

  const targetInput = page.locator('label').filter({ hasText: /Target/ }).locator('input')
  await expect(targetInput).toBeVisible()
  await targetInput.fill('https://hooks.slack.com/example')

  await page.getByRole('button', { name: /Add channel/i }).click()
  // AlertChannelList re-renders and shows the new channel label.
  await expect(page.getByText('risk-team').first()).toBeVisible()

  // ── 12. Send test event on the new channel ─────────────────────────────────
  // AlertTestButton is scoped to the new channel's list item.
  // Multiple risk-team channels may exist from prior runs; target the first one
  // (channels are listed in insertion order, oldest first).
  const riskTeamItems = page.locator('li').filter({ hasText: 'risk-team' })
  const riskTeamItem = riskTeamItems.first()
  await riskTeamItem.getByRole('button', { name: /Send test event/i }).click()
  // After the mock call resolves the button text changes to "Sent ✓" for 3 s.
  await expect(riskTeamItem.getByRole('button', { name: /Sent ✓/i })).toBeVisible({ timeout: 2_000 })

  // ── 13. Create a new alert rule ────────────────────────────────────────────
  await page.goto('/alerts/rules/new')
  // AlertRuleForm: Label field.
  const ruleLabelInput = page.locator('label').filter({ hasText: /^Label$/ }).locator('input')
  await expect(ruleLabelInput).toBeVisible()
  await ruleLabelInput.fill('high leverage anywhere')

  // Threshold field (number input).
  const thresholdInput = page.locator('label').filter({ hasText: /^Threshold$/ }).locator('input')
  await expect(thresholdInput).toBeVisible()
  await thresholdInput.fill('0.75')

  // Channels fieldset — check the first available channel checkbox.
  // If risk-team was just added it should be listed; check it.
  const firstChannelCheckbox = page.locator('fieldset').locator('input[type="checkbox"]').first()
  const hasChannel = await firstChannelCheckbox.isVisible({ timeout: 1_000 }).catch(() => false)
  if (hasChannel) {
    await firstChannelCheckbox.check()
  }

  await page.getByRole('button', { name: /Save rule/i }).click()
  // After save the server action redirects to /alerts/rules.
  await expect(page).toHaveURL(/\/alerts\/rules/)
  await expect(page.getByText('high leverage anywhere').first()).toBeVisible()

  // ── 14. Test the rule and verify the event appears in the feed ─────────────
  // AlertRuleList renders a "Test rule" button for each rule.
  // Multiple rules with the same label may exist from prior runs; use first.
  const ruleItem = page.locator('li').filter({ hasText: 'high leverage anywhere' }).first()
  await ruleItem.getByRole('button', { name: /Test rule/i }).click()
  // The server action appends an ephemeral event; navigate to the feed.
  await page.goto('/alerts')
  // testAlertRule sets title: `Test event for rule "${rule.label}"`.
  await expect(page.getByText(/Test event for rule.*high leverage anywhere/i)).toBeVisible({ timeout: 5_000 })

  // ── 15. Drift-guard ────────────────────────────────────────────────────────
  expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toEqual([])
})

test('admin can approve a submitted memo', async ({ page }) => {
  // ── 1. Sign in as counterparty and submit the memo ─────────────────────────
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()

  await page.goto('/datasets/ds_acred/memo')
  // If memo is already submitted (from the previous test run's in-memory state),
  // the submit button won't appear — that's fine; we just need it to reach submitted.
  const submitButton = page.getByRole('button', { name: /Submit for IC review/i })
  const isAlreadySubmitted = await page.getByText('Submitted for IC review').first().isVisible().catch(() => false)
  if (!isAlreadySubmitted) {
    await expect(submitButton).toBeVisible()
    await submitButton.click()
    await expect(page.getByText('Submitted for IC review').first()).toBeVisible()
  }

  // ── 2. Switch to admin via the RoleSwitcher floating widget ───────────────
  // RoleSwitcher is a fixed floating form on every app page.
  // Its buttons carry the role name as text: "counterparty", "originator", "admin".
  // We click the "admin" button (aria-pressed="false" when not current role).
  // Use exact=true to avoid matching "Demo Admin" button on the login page.
  const adminRoleButton = page.getByRole('button', { name: 'admin', exact: true })
  await expect(adminRoleButton).toBeVisible()
  await adminRoleButton.click()
  // The POST to /role-switch redirects to "/" which is an app page.
  await page.waitForURL(/^http:\/\/localhost:\d+\/$/)

  // ── 3. Navigate to the memo as admin and approve ───────────────────────────
  await page.goto('/datasets/ds_acred/memo')
  // MemoStatusBar shows "Approve" and "Request changes" for admin when submitted.
  const approveButton = page.getByRole('button', { name: /^Approve$/i })
  await expect(approveButton).toBeVisible()
  await approveButton.click()
  // The server action runs approveMemo + revalidates, triggering a full re-render.
  // With admin's getActiveMemo now surfacing approved memos, the status label shows "Approved".
  // Use a generous timeout to allow the Next.js revalidation round-trip.
  await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 8_000 })
})
