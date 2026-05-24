// tests/e2e/sources.spec.ts
import { expect, test } from '@playwright/test'

test.describe('/sources — connected tab', () => {
  test('renders the page shell and the connected list', async ({ page }) => {
    await page.goto('/sources')
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Connected/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Catalogue/i })).toBeVisible()
    // Stripe fixture row — aria-label starts with "Stripe — healthy"
    await expect(page.getByRole('button', { name: /Stripe — healthy/i })).toBeVisible()
  })

  test('?tab=catalogue deep-link selects the Catalogue tab', async ({ page }) => {
    await page.goto('/sources?tab=catalogue')
    // CatalogueTab renders a <h2> per category; "Payments" is the first category
    await expect(page.getByRole('heading', { name: /Payments/i })).toBeVisible()
  })
})

test.describe('/sources — add-source modal', () => {
  test('opens via CTA, picker → auth (S3 form) → trust → discover → confirm → done', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()

    // Picker — search input auto-focuses
    const dialog = page.getByRole('dialog')
    await expect(page.getByPlaceholder('Search providers…')).toBeFocused()

    // Pick Amazon S3 from the picker grid (wired connectors only)
    // Button accessible name is "<wordmark> <provider name>" e.g. "S3 Amazon S3"
    await dialog.getByRole('button', { name: /Amazon S3/i }).click()

    // Auth step — modal header h2 shows connector name (sr-only DialogTitle + visible header both match)
    await expect(page.getByRole('heading', { name: /Amazon S3/i }).nth(1)).toBeVisible()

    // Fill S3 form — bucket (text input), region (select), accessKeyId (text), secretAccessKey (password)
    await page.getByLabel(/Bucket/i).fill('hyve-test')
    await page.getByLabel(/Region/i).click()
    await page.getByRole('option', { name: 'us-east-1' }).click()
    await page.getByLabel(/Access key ID/i).fill('AKIATESTKEY001')
    await page.getByLabel(/Secret access key/i).fill('SecretKey1234567890')

    await page.getByRole('button', { name: /Continue/i }).click()

    // Trust step
    await expect(page.getByRole('heading', { name: /What Hyve will do with your Amazon S3 data/i })).toBeVisible()
    await page.getByRole('button', { name: /Continue →/i }).click()

    // Discover step — narration text appears
    await expect(page.getByText(/Connecting to bucket/i)).toBeVisible()

    // Confirm step — shows "X of N selected"
    await expect(page.getByText(/of \d+ selected/)).toBeVisible({ timeout: 8000 })

    // Connect button
    await page.getByRole('button', { name: /Connect Amazon S3 →/i }).click()

    // Done step
    await expect(page.getByRole('heading', { name: /Amazon S3 is connected/i })).toBeVisible({ timeout: 5000 })
  })

  test('Catalogue card → "soon" connector shows a toast, no modal', async ({ page }) => {
    await page.goto('/sources?tab=catalogue')
    // Adyen has wired: 'soon' — aria-label is "Adyen — Coming soon"
    await page.getByRole('button', { name: /^Adyen/i }).click()
    // Toast text is `${name} is coming soon…` where name = 'adyen' (lowercase) — match case-insensitively
    await expect(page.getByText(/adyen is coming soon/i)).toBeVisible()
  })

  test('Stripe (OAuth) flows through Hyve Bridge', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()

    // Pick Stripe from picker
    // Button accessible name is "<wordmark> <provider name>" e.g. "S Stripe"
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /\bStripe\b/i }).click()

    // Auth step — OAuth shape shows "Sign in with Stripe →"
    await page.getByRole('button', { name: /Sign in with Stripe/i }).click()

    // Hyve Bridge interstitial
    await expect(page.getByRole('heading', { name: /Authorize Hyve to read this Stripe account/i })).toBeVisible()
    await page.getByRole('button', { name: /Approve →/i }).click()

    // Trust step for Stripe
    await expect(page.getByRole('heading', { name: /What Hyve will do with your Stripe data/i })).toBeVisible()
  })

  test('Escape with dirty Auth confirms before closing', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Amazon S3/i }).click()
    await page.getByLabel(/Bucket/i).fill('hyve-test')
    await page.keyboard.press('Escape')
    // AlertDialog appears
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: /Keep editing/i }).click()
    // Modal should still be present
    await expect(page.getByLabel(/Bucket/i)).toBeVisible()
  })
})

test.describe('/sources — manage drawer', () => {
  test('clicking a connection row opens the drawer', async ({ page }) => {
    await page.goto('/sources')

    // Click the Stripe connection row
    await page.getByRole('button', { name: /Stripe — healthy/i }).click()

    // ManageDrawer renders a Sheet which is role="dialog"
    await expect(page.getByRole('dialog')).toBeVisible()

    // Health section heading (rendered as <h3> via the Section component)
    await expect(page.getByText(/^Health$/)).toBeVisible()

    // Pause button visible (Stripe status is 'ok')
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible()

    // Escape closes the drawer
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Reconnect from drawer opens modal at Auth for that connector', async ({ page }) => {
    await page.goto('/sources')

    // Open Stripe drawer
    await page.getByRole('button', { name: /Stripe — healthy/i }).click()

    // Click Reconnect — drawer closes, modal opens at Auth step for Stripe
    await page.getByRole('button', { name: /Reconnect/i }).click()

    // Modal header shows connector name (sr-only DialogTitle + visible header both match)
    await expect(page.getByRole('heading', { name: /^Stripe/i }).nth(1)).toBeVisible()

    // OAuth auth shape shows the "Sign in with Stripe →" button
    await expect(page.getByRole('button', { name: /Sign in with Stripe/i })).toBeVisible()
  })
})
