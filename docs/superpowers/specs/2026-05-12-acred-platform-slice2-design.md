# ACRED Platform Slice 2 — Action Layer Design

**Date:** 2026-05-12
**Status:** Approved (brainstorming)
**Owner:** @electricddev
**Builds on:** `2026-05-12-acred-monitoring-brief-design.md`

## Goal

Turn the slice-1 monitoring brief from a read-only summary into an actionable workflow. Add four surfaces and a decision layer on the brief so an InfiniFi-style analyst can: write a structured DD memo against the snapshot, act on red flags and anomalies in-place, hold issuers to data SLAs, and subscribe to a cross-portfolio anomaly feed via configurable channels.

The artefact this slice produces: an analyst opens `/datasets/ds_acred`, sees the brief, acknowledges flags with notes, writes the 5-Cs memo, submits for IC review; meanwhile the AMM operator subscribes their algo to alerts on the same anomalies via `/alerts`. ACRED supplies the real signal spine; everything else is mocked-but-correct with action affordances that visibly mutate state in the dev session.

## Non-goals

- Per-persona route gating. Slice 3.
- Real Slack / email / webhook delivery. UI flows + a "Send test event" mock are the bar.
- AMM operator action controls (set fee, pause, approve large swaps). Slice 3.
- Cross-fund consensus pricing as a standalone surface. Stays a side-panel tile on the brief.
- Issuer-side portal (the manager's view of what InfiniFi requires). Persona 3, slice 3+.
- AI / model layer (memo auto-drafting, anomaly classification, parameter recommendation). Deferred per prior decision.
- Real auth / sessions / authorization. Stub auth from slice 1 remains.
- Real-time push to clients. Subscriptions are illustrative; the UI re-fetches on revalidation or page load.

## Audience and surfaces

| Surface | Route | Persona | Purpose |
|---|---|---|---|
| DD Memo workspace | `/datasets/ds_acred/memo` (new tab) | DD analyst | Structured 5-Cs memo with auto-population, red-flag checklist, sign-off |
| Decision affordances | inline on `/datasets/ds_acred` | DD analyst | Ack / snooze / threshold / dismiss / pin / watch — on the brief itself |
| Issuer Compliance | `/issuers` (list), `/issuers/[issuerId]` (detail) | DD analyst, allocator | SLA terms, attestation grade, request controls, audit log of issuer interactions |
| Alerts feed | `/alerts` (Feed / Rules / Channels tabs) | DD analyst, AMM operator | Cross-portfolio anomaly stream, alert-rule builder, notification channel config |

Decision affordances modify the slice-1 brief in place; they are not a separate surface but they require new components and new endpoints.

## Architecture

### Decision-state store (cross-cutting)

A new module-level mutable fixture stores decision state for the dev session: `lib/api/fixtures/decisions.ts`. Survives module hot-reload, lost on dev-server restart. Same persistence semantics as the existing `notebooks` and `runs` mock stores.

Shape:

```ts
// In-memory stores (mutated by server actions, read by server components)
let acknowledgedFlags:  AcknowledgedFlag[]  = []
let dismissedAnomalies: DismissedAnomaly[] = []
let thresholds:         Threshold[]        = []
let watchEntries:       WatchEntry[]       = []
let issuerRequests:     IssuerRequest[]    = []  // sla request audit log
let alertRules:         AlertRule[]        = []
let alertChannels:      AlertChannel[]     = []
let memos:              Memo[]             = [exampleAcredDraftMemo]   // seeded with one draft
```

These are flat arrays mutated by appending or rewriting entries (LWW). Each entry carries `actorId` (user id from session) and timestamps for audit-log rendering.

### Memo workspace

`/datasets/ds_acred/memo` is a new tab on the existing dataset layout (visible only when `datasetId === 'ds_acred'`). The page is a Server Component that:

1. Loads (or creates) the active draft memo via `getOrCreateActiveAcredMemo(ctx)`.
2. Server-renders the 5-Cs section shell with current field values.
3. Mounts a client subtree (`<MemoEditor />`) for per-section editing.

The memo is a typed object — not a generic notebook:

```ts
type Memo = {
  id: string
  datasetId: string
  authorId: string
  status: 'draft' | 'submitted' | 'approved'
  createdAt: string
  updatedAt: string
  submittedAt?: string
  approvedAt?: string
  approvedBy?: string
  sections: {
    character: MemoSection
    capacity:  MemoSection
    capital:   MemoSection
    collateral: MemoSection
    conditions: MemoSection
  }
  flagDecisions: FlagDecision[]
}

type MemoSection = {
  markdown: string
  inserts: MemoInsert[]   // citation-linked data blocks
}

type MemoInsert = {
  id: string
  methodologyId: string   // e.g. 'acred.top10_borrowers'
  insertedAt: string
  // The renderer re-runs the methodology at render time (DuckDB) and captures
  // the result snapshot as a citation footnote.
}

type FlagDecision = {
  flagId: string           // matches RedFlag.id
  action: 'acknowledge' | 'dismiss' | 'mitigate'
  note: string             // required for acknowledge/dismiss; freeform for mitigate
  decidedAt: string
  decidedBy: string
}
```

5-C section semantics (the analyst gets a prompt at the top of each section):

| C | Prompt | "Insert data" candidates |
|---|---|---|
| Character | Issuer track record and reputation | First-seen N-PORT period, count of filings, recurring borrowers |
| Capacity | Ability to service debt | Leverage trend, non-accrual % trend, coupon distribution |
| Capital | Composition of the portfolio | Top-10 borrowers, sector mix, NAV history, maturity profile |
| Collateral | Seniority and concentration | First-lien %, top-10 concentration trend, default count |
| Conditions | Macro / sector exposure | Industry mix, geography mix, comparison vs prior period |

Each "Insert data" candidate is a methodology id pulled from the slice-1 catalog (`lib/data/acred/methodology.ts`); inserting embeds a citation footnote with the run timestamp and snapshot anchor.

**Status workflow:**

- `draft` — editable by author; "Save" and "Submit for IC review" buttons.
- `submitted` — locked for edits; admin persona sees "Approve" and "Request changes" buttons. Non-admin sees the locked memo.
- `approved` — final, immutable, downloadable.

Status transitions are server actions that mutate the memo entry in `decisions.ts` and append an audit entry.

The brief's "Draft DD memo" CTA from slice 1 routes to `/datasets/ds_acred/memo` instead of the previous `/notebooks/new?prefill=...`.

### Decision affordances on the brief

The slice-1 `<RedFlagScoreboard>` and `<AnomalyFeed>` components grow action controls. Behavior:

**Red flags:**
- Each row gets three buttons: **Acknowledge / Snooze 7d / Set threshold**.
- Acknowledge opens a popover with a textarea (required). On submit, creates an `AcknowledgedFlag` entry; that flag drops out of the active scoreboard for the remaining session (visible in an "Acknowledged" sub-list).
- Snooze 7d sets `expiresAt = now + 7d`; same drop-out behavior until expiry. (For dev simplicity, snooze is honored as long as the in-memory entry exists.)
- Set threshold opens a slider for the rule's underlying metric and writes a `Threshold` entry. The rule library re-evaluates against the new threshold next render. (Per-rule overrides — defaults still ship from `acredRedFlagRules`.)

**Anomalies:**
- Each row gets **Dismiss / Pin to memo / Convert to alert rule**.
- Dismiss with reason → `DismissedAnomaly` entry; drops out of feeds.
- Pin to memo → appends a `MemoInsert` referencing the anomaly into the active draft memo's Conditions section.
- Convert to alert rule → opens the alert-rule builder on `/alerts/rules/new` with the event's metric/severity pre-filled.

**Brief header:**
- **Watch** toggle — creates/removes a `WatchEntry` for the current dataset + user.
- Channel picker (Slack / email / webhook) — modifies the entry's `channels`.
- "Watching" badge shows count of watchers across the dev session for the dataset (illustrative).

### Issuer Compliance / SLA workspace

`/issuers` is a new top-level route under the `(app)` group. Two pages:

**`/issuers` (list)** — Table of issuers across the portfolio:

| Column | Source |
|---|---|
| Issuer | `org.name` |
| Assets originated | count of datasets where `originatorOrgId === org.id` |
| Compliance grade | concrete numbers (on-time/expected over last 30d) — same shape as slice-1 attestation discipline |
| Last interaction | most recent `IssuerRequest` from this user's org |
| Open requests | count of `IssuerRequest` with `status === 'pending'` |

Apollo (org_apollo) is the real one with attached SLA data. Three mocked peer issuers get added: `org_janus`, `org_fasanara_mgr`, `org_amsmgr`. Existing `org_tradefin` and `org_creditbridge` get IssuerCompliance shapes attached for completeness.

**`/issuers/[issuerId]` (detail)** — Five sections:

1. **Asset roster** — list of datasets this issuer originates with status + last-attest timestamp.
2. **SLA terms** — table of attestation cadences with delivered/expected/on-time counts. Same shape as `AttestationDiscipline`.
3. **Attestation discipline grade** — concrete (no letter grade) — same pattern as slice 1.
4. **Action controls:**
   - **Request weekly leverage attestation** — opens a form with metric / cadence / start date.
   - **Mark SLA gap as accepted** — opens a form with gap selection + reason.
   - **Renegotiate SLA** — opens a freeform proposal modal.
   Each submission appends an `IssuerRequest` entry.
5. **Interaction log** — audit trail of all `IssuerRequest` rows for this issuer + user, sorted newest-first.

### Alerts feed (`/alerts`)

`/alerts` has three sub-routes:

**`/alerts` (Feed) — default tab.**
- Cross-portfolio anomaly stream: aggregates `AnomalyEvent` from ACRED's real feed plus mocked events seeded for the other portfolio datasets (4 events per peer asset).
- Filter bar: kind (multiselect: credit-event / filing / attestation-gap / amm-sla), severity (info / low / medium / high), asset (multiselect across portfolio).
- Each row gets the same Dismiss / Pin to memo / Convert to alert rule buttons as the brief's feed.

**`/alerts/rules` (Rules tab).**
- List of `AlertRule` entries with enabled/disabled toggle.
- Builder form: condition (metric + threshold + direction) × scope (asset multiselect) × action (channel multiselect).
- "Create rule" button at top. "Edit" pencil on each row.
- "Test rule" button per row — emits a synthetic `AnomalyEvent` into the feed for 30s.

**`/alerts/channels` (Channels tab).**
- CRUD on `AlertChannel`: kind (slack | email | webhook), label, target (URL or email address).
- "Send test event" button per channel — mocked: shows a toast "Sent to <kind>" and appends a row to the channel's recent-deliveries log.

### Auth and role behavior

No new auth. The existing three personas (`counterparty`, `originator`, `admin`) drive these visibility rules:

- Memo: any logged-in user can read draft memos for their org. Author (or any counterparty) can edit drafts. Only admins see "Approve" / "Request changes" on submitted memos. Slice-3 will narrow per-org.
- Issuers: any logged-in user can read. Request submission and accept actions are gated to `counterparty` and `admin` (not originator — originators are issuers themselves; slice 3 introduces issuer-side counterpart views).
- Alerts: any logged-in user can read. Rule and channel CRUD gated to `counterparty` and `admin`.

Role gating is enforced server-side in the action handler (server actions and mock endpoints). Client-side rendering hides controls the current persona can't use.

## Schema & API

### New Zod types

Append to `lib/api/schemas.ts` in a new section `// ---------- Decision layer ----------`:

```ts
export const MemoStatusSchema = z.enum(['draft', 'submitted', 'approved'])
export type MemoStatus = z.infer<typeof MemoStatusSchema>

export const MemoInsertSchema = z.object({
  id: z.string(),
  methodologyId: z.string(),
  insertedAt: z.string().datetime(),
})
export type MemoInsert = z.infer<typeof MemoInsertSchema>

export const MemoSectionSchema = z.object({
  markdown: z.string().default(''),
  inserts: z.array(MemoInsertSchema).default([]),
})
export type MemoSection = z.infer<typeof MemoSectionSchema>

export const FlagDecisionActionSchema = z.enum(['acknowledge', 'dismiss', 'mitigate'])
export const FlagDecisionSchema = z.object({
  flagId: z.string(),
  action: FlagDecisionActionSchema,
  note: z.string(),
  decidedAt: z.string().datetime(),
  decidedBy: z.string(),
})
export type FlagDecision = z.infer<typeof FlagDecisionSchema>

export const MemoSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  authorId: z.string(),
  status: MemoStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().optional(),
  sections: z.object({
    character:  MemoSectionSchema,
    capacity:   MemoSectionSchema,
    capital:    MemoSectionSchema,
    collateral: MemoSectionSchema,
    conditions: MemoSectionSchema,
  }),
  flagDecisions: z.array(FlagDecisionSchema).default([]),
})
export type Memo = z.infer<typeof MemoSchema>

export const AcknowledgedFlagSchema = z.object({
  flagId: z.string(),
  datasetId: z.string(),
  acknowledgedBy: z.string(),
  acknowledgedAt: z.string().datetime(),
  note: z.string(),
  expiresAt: z.string().datetime().optional(),
})
export type AcknowledgedFlag = z.infer<typeof AcknowledgedFlagSchema>

export const DismissedAnomalySchema = z.object({
  anomalyId: z.string(),
  dismissedBy: z.string(),
  dismissedAt: z.string().datetime(),
  reason: z.string(),
})
export type DismissedAnomaly = z.infer<typeof DismissedAnomalySchema>

export const ThresholdDirectionSchema = z.enum(['above', 'below'])
export const ThresholdSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  datasetId: z.string(),
  metric: z.string(),
  value: z.number(),
  direction: ThresholdDirectionSchema,
  setBy: z.string(),
  setAt: z.string().datetime(),
})
export type Threshold = z.infer<typeof ThresholdSchema>

export const NotificationChannelKindSchema = z.enum(['slack', 'email', 'webhook'])
export type NotificationChannelKind = z.infer<typeof NotificationChannelKindSchema>

export const WatchEntrySchema = z.object({
  datasetId: z.string(),
  userId: z.string(),
  channels: z.array(NotificationChannelKindSchema).default([]),
  watchedAt: z.string().datetime(),
})
export type WatchEntry = z.infer<typeof WatchEntrySchema>

export const IssuerRequestKindSchema = z.enum(['attestation-request', 'gap-acceptance', 'sla-renegotiation'])
export const IssuerRequestStatusSchema = z.enum(['pending', 'accepted', 'declined'])
export const IssuerRequestSchema = z.object({
  id: z.string(),
  issuerId: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string().datetime(),
  kind: IssuerRequestKindSchema,
  payload: z.record(z.unknown()),  // shape varies by kind; checked at form level
  status: IssuerRequestStatusSchema,
})
export type IssuerRequest = z.infer<typeof IssuerRequestSchema>

export const SlaCadenceSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
export const IssuerComplianceSchema = z.object({
  issuerId: z.string(),
  assetIds: z.array(z.string()),
  discipline: AttestationDisciplineSchema,  // reuse slice-1 schema
  openRequestCount: z.number().int().nonnegative(),
})
export type IssuerCompliance = z.infer<typeof IssuerComplianceSchema>

export const AlertChannelSchema = z.object({
  id: z.string(),
  kind: NotificationChannelKindSchema,
  label: z.string(),
  target: z.string(),  // URL for slack/webhook; email address for email
  createdBy: z.string(),
  createdAt: z.string().datetime(),
})
export type AlertChannel = z.infer<typeof AlertChannelSchema>

export const AlertRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  condition: z.object({
    metric: z.string(),                  // e.g. 'leverage', 'nonAccrualPct'
    threshold: z.number(),
    direction: ThresholdDirectionSchema,
  }),
  scope: z.object({
    datasetIds: z.array(z.string()),     // empty = all
    kinds: z.array(z.string()).default([]),       // event kinds filter
    severities: z.array(z.string()).default([]),  // severities filter
  }),
  channelIds: z.array(z.string()),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
})
export type AlertRule = z.infer<typeof AlertRuleSchema>
```

### New mock endpoints (in `lib/api/endpoints/`)

| File | Endpoint | Method semantics |
|---|---|---|
| `memos.ts` | `getActiveMemo(ctx, datasetId)` | Returns or creates the draft memo for the user+dataset |
| `memos.ts` | `updateMemoSection(ctx, memoId, sectionKey, section)` | Mutates a section's markdown + inserts |
| `memos.ts` | `recordFlagDecision(ctx, memoId, decision)` | Appends a FlagDecision |
| `memos.ts` | `submitMemo(ctx, memoId)` | Transitions to submitted; gate: status === draft |
| `memos.ts` | `approveMemo(ctx, memoId)` | Transitions to approved; gate: role === admin && status === submitted |
| `memos.ts` | `requestMemoChanges(ctx, memoId, note)` | Transitions back to draft; gate: role === admin |
| `decisions.ts` | `listAcredAcknowledgedFlags(ctx)` | Filtered by non-expired |
| `decisions.ts` | `acknowledgeFlag(ctx, payload)` | Append AcknowledgedFlag |
| `decisions.ts` | `snoozeFlag(ctx, payload)` | Append with expiresAt = now + 7d |
| `decisions.ts` | `listDismissedAnomalies(ctx)` | All |
| `decisions.ts` | `dismissAnomaly(ctx, payload)` | Append DismissedAnomaly |
| `decisions.ts` | `listThresholds(ctx, datasetId?)` | All (optionally filtered) |
| `decisions.ts` | `setThreshold(ctx, payload)` | Append Threshold |
| `decisions.ts` | `listWatchEntries(ctx, userId?)` | All / filtered |
| `decisions.ts` | `setWatch(ctx, payload)` | Upsert WatchEntry |
| `decisions.ts` | `clearWatch(ctx, datasetId)` | Remove |
| `issuers.ts` | `listIssuers(ctx)` | Array of IssuerCompliance |
| `issuers.ts` | `getIssuer(ctx, issuerId)` | One |
| `issuers.ts` | `listIssuerRequests(ctx, issuerId?)` | Audit log |
| `issuers.ts` | `submitIssuerRequest(ctx, payload)` | Append |
| `alerts.ts` | `listAlertEvents(ctx, filters?)` | Aggregated cross-portfolio AnomalyEvent[] |
| `alerts.ts` | `listAlertRules(ctx)` | All |
| `alerts.ts` | `createAlertRule(ctx, payload)` | Append |
| `alerts.ts` | `updateAlertRule(ctx, ruleId, patch)` | Replace |
| `alerts.ts` | `deleteAlertRule(ctx, ruleId)` | Filter out |
| `alerts.ts` | `testAlertRule(ctx, ruleId)` | Emits a synthetic AnomalyEvent for 30s |
| `alerts.ts` | `listAlertChannels(ctx)` | All |
| `alerts.ts` | `createAlertChannel(ctx, payload)` | Append |
| `alerts.ts` | `deleteAlertChannel(ctx, channelId)` | Filter out |
| `alerts.ts` | `sendTestEvent(ctx, channelId)` | Mocked dispatch; appends to recent-deliveries |

Each endpoint Zod-validates its payload and return shape. The decision-state endpoints are also exposed as Server Actions where mutation is triggered from a client form.

### Brief endpoints — augment slice-1

`getAcredBriefRedFlags` and `getAcredAnomalyFeed` from slice 1 grow filters:

```ts
getAcredBriefRedFlags(ctx, { includeAcknowledged?: boolean })
getAcredAnomalyFeed(ctx, { includeDismissed?: boolean })
```

Default `false` for both. The brief renders only "active" entries; the new "Acknowledged" / "Dismissed" sub-lists call with `true`.

`evaluateAcredRedFlags` from slice 1 takes an optional `thresholds: Threshold[]` argument; the rules check user-set thresholds before falling back to their defaults.

## Routes

### New

```
app/(app)/datasets/[datasetId]/memo/page.tsx       NEW   server: gate on ds_acred + auth
app/(app)/datasets/[datasetId]/memo/loading.tsx    NEW   skeleton

app/(app)/issuers/page.tsx                          NEW   issuers list
app/(app)/issuers/[issuerId]/page.tsx               NEW   issuer detail
app/(app)/issuers/[issuerId]/loading.tsx            NEW   skeleton
app/(app)/issuers/_components/                      NEW   issuer list/table + detail panels

app/(app)/alerts/page.tsx                           NEW   feed (default tab)
app/(app)/alerts/layout.tsx                         NEW   tab nav
app/(app)/alerts/rules/page.tsx                     NEW   rule builder list
app/(app)/alerts/rules/new/page.tsx                 NEW   rule builder
app/(app)/alerts/rules/[ruleId]/page.tsx            NEW   rule edit
app/(app)/alerts/channels/page.tsx                  NEW   channel CRUD
app/(app)/alerts/loading.tsx                        NEW   skeleton
```

### Modified

```
app/(app)/datasets/[datasetId]/layout.tsx           MODIFY  add "Memo" tab when ds_acred
app/(app)/datasets/[datasetId]/page.tsx             MODIFY  pass acked/dismissed/thresholds into AcredBrief
components/features/brief/red-flag-scoreboard.tsx   MODIFY  add action buttons
components/features/brief/anomaly-feed.tsx          MODIFY  add action buttons
components/features/brief/brief-header.tsx          MODIFY  add Watch toggle + channel picker
components/features/brief/acred-brief.tsx           MODIFY  wire through props + acknowledged/dismissed sub-lists
components/features/brief/drill-out-actions.tsx     MODIFY  "Draft DD memo" routes to /datasets/ds_acred/memo
components/shell/sidebar.tsx                         MODIFY  add Issuers + Alerts nav entries
lib/api/endpoints/datasets.ts                        MODIFY  filter args on red-flags + anomalies
lib/data/acred/red-flags.ts                          MODIFY  evaluator accepts optional thresholds
lib/api/schemas.ts                                   MODIFY  add Decision layer types
```

## Component composition

```
components/features/memo/
  memo-editor.tsx                    NEW  client root; tabs across 5 sections
  memo-section-shell.tsx             NEW  per-section frame with prompt + editor + inserts
  memo-section-editor.tsx            NEW  markdown textarea with autosave
  memo-insert-picker.tsx             NEW  popover listing methodology candidates per section
  memo-insert-block.tsx              NEW  renders the methodology result inline with footnote
  memo-flag-checklist.tsx            NEW  ack/dismiss/mitigate per active flag with notes
  memo-status-bar.tsx                NEW  status pill + submit/approve/request-changes buttons
  memo-audit-log.tsx                 NEW  status transitions + flag decisions, newest first

components/features/brief/
  red-flag-card.tsx                  NEW  extracted from red-flag-scoreboard for the action variant
  red-flag-action-bar.tsx            NEW  ack / snooze / threshold buttons + popovers
  anomaly-row.tsx                    NEW  extracted from anomaly-feed for the action variant
  anomaly-action-bar.tsx             NEW  dismiss / pin-to-memo / convert-to-alert
  watch-toggle.tsx                   NEW  toggle + channel picker
  threshold-slider-popover.tsx       NEW  metric-specific slider that posts to setThreshold

components/features/issuers/
  issuer-table.tsx                   NEW  list view
  issuer-detail-header.tsx           NEW  detail page header
  issuer-asset-roster.tsx            NEW  list of datasets originated
  issuer-sla-table.tsx               NEW  cadenceBreakdown rendered as table
  issuer-action-panel.tsx            NEW  three action buttons + their forms
  issuer-request-log.tsx             NEW  audit log

components/features/alerts/
  alert-feed.tsx                     NEW  filterable cross-portfolio feed
  alert-filter-bar.tsx               NEW  filter chips
  alert-rule-list.tsx                NEW  rules table with enabled toggle
  alert-rule-form.tsx                NEW  condition × scope × action builder
  alert-channel-list.tsx             NEW  channel CRUD table
  alert-channel-form.tsx             NEW  add-channel form
  alert-test-button.tsx              NEW  "send test event" + result toast
```

### Component reuse from slice 1

- `<DeltaTile>`, `<DeltaCell>`, `<AttestationCell>` — used in issuer detail and alerts feed
- `<DemoBadge>` — every mocked side panel keeps it
- `<AnomalyFeed>` → refactored to compose `<AnomalyRow>` so both inline-brief and standalone-alerts surfaces share rendering
- `<RedFlagScoreboard>` → refactored similarly into `<RedFlagCard>` + the action-variant `<RedFlagActionBar>`
- `<BriefHeader>` — augmented (Watch toggle) but the existing surface is unchanged for non-ACRED

### Sidebar

`components/shell/sidebar.tsx` gains two top-level entries between Datasets and Notebooks:

- **Issuers** → `/issuers`
- **Alerts** → `/alerts` (with a small numeric badge showing unread count when > 0; unread = events newer than the user's last visit timestamp stored in `decisions.ts`)

## Memo "Insert data" flow

When the user clicks "Insert data" inside a section:

1. A popover shows the methodology candidates for that section's C.
2. Selecting a methodology immediately appends a `MemoInsert` referencing its id; the section is autosaved (server action).
3. The `<MemoInsertBlock>` component renders the methodology result client-side via DuckDB (reuses `useCellQuery` from the notebook slice). The result snapshot is shown inline with a footnote `[1]` linking back to the methodology id + period anchor.
4. Footnotes are numbered per-section in render order and listed at the section's bottom.

Re-rendering: each `<MemoInsertBlock>` re-runs its DSL on every viewer mount. There is no result caching — same as the notebook viewer pattern.

## Threshold slider — per-metric specifications

Only certain red-flag rules have meaningful user-settable thresholds. Mapping:

| Rule id | Metric | Slider range | Default |
|---|---|---|---|
| acred.non_accrual_rising | non_accrual_delta | 0.05 – 0.50 pp | 0.20 |
| acred.non_accrual_high | non_accrual | 0.5 – 3.0 % | 1.5 |
| acred.leverage_drift | leverage_delta | 0.5 – 5.0 pp | 2.0 |
| acred.leverage_high | leverage | 60 – 90 % | 75 |
| acred.top10_drift | top10_delta | 0.5 – 5.0 pp | 2.0 |
| acred.pik_rising | pik | 3 – 15 % | 8 |

Rules `industry_concentration` and `recent_high_severity_event` are not slider-eligible — their "Set threshold" button is hidden.

## Auth and Server-Action shape

Each mutation is a Server Action exposed from the corresponding endpoint module. Pattern matches the existing `updateNotebookCells` server-action in `app/(app)/notebooks/[notebookId]/actions.ts`. Action signatures:

```ts
'use server'
async function actionAcknowledgeFlag(payload: { flagId, datasetId, note }): Promise<{ ok: true } | { ok: false; reason: string }> { ... }
async function actionSubmitMemo(memoId: string): Promise<{ ok: true } | { ok: false; reason: string }> { ... }
// etc.
```

Server actions revalidate the affected route via `revalidatePath('/datasets/ds_acred')` etc.

## Loading, error, and edge cases

- **Memo race:** two browser tabs editing the same memo. Last write wins on the section level (one section's update overwrites only that section). No optimistic concurrency control — flag in the risks section.
- **Memo without active draft:** `getActiveMemo` creates a new draft if none exists for `(datasetId, authorId)`. Idempotent.
- **Acknowledge expiry:** in-memory store is filtered by `expiresAt` at read time. No background cleanup needed.
- **Threshold for a non-existent rule:** the rule library treats unknown overrides as no-op; the threshold persists but doesn't affect output. The settings UI shouldn't allow creating such thresholds, but the data layer is defensive.
- **Alert rule referencing a deleted channel:** rule still fires; "Send test event" no-ops with a toast warning ("Channel was deleted").
- **Issuer request payload validation:** payloads vary by kind; each request kind has a sub-schema used at form-submission time. Storage uses `payload: z.record(z.unknown())` to keep the persistence layer permissive.
- **Cross-portfolio alert feed:** ACRED contributes real `credit-event` and `filing` rows from slice-1 `acredAnomalyFeed`. Each of the 4 peer datasets gets 4 mocked events seeded into the same store. Total ~20 events at slice start.
- **Synthetic test rule emission:** `testAlertRule` pushes a one-off `AnomalyEvent` with `id: 'test_<rule>_<ts>'`. UI marks it as a test. Lives in the feed for 30s then auto-evicts on next list call.
- **Sidebar badge:** "unread" count uses `(lastVisitedAlerts: Record<string, string>)` per-user in `decisions.ts`. Updated on `/alerts` page load.
- **Memo flagDecisions on flag set changes:** if the underlying red-flag set changes (e.g., a rule is removed), saved decisions remain in the memo but won't render as required checklist items. The audit log still shows them.

## Testing

### Unit (Vitest)

- `tests/unit/api/decision-schemas.test.ts` — all new schemas parse and reject expected bad payloads
- `tests/unit/api/memo-endpoint.test.ts` — `getActiveMemo` creates on first call; status transitions enforce gates
- `tests/unit/api/decisions-endpoint.test.ts` — acknowledge filters from active list; snooze respects expiry; thresholds round-trip
- `tests/unit/api/issuers-endpoint.test.ts` — listIssuers returns IssuerCompliance for every fixture; submitIssuerRequest appends
- `tests/unit/api/alerts-endpoint.test.ts` — rule CRUD; testAlertRule injects synthetic event; channel send-test no-ops gracefully on missing channel
- `tests/unit/data/acred/red-flags-threshold.test.ts` — `evaluateAcredRedFlags` with override thresholds re-trips/un-trips rules
- `tests/unit/components/memo/memo-flag-checklist.test.tsx` — required-note enforcement on ack/dismiss
- `tests/unit/components/memo/memo-status-bar.test.tsx` — role gates show/hide buttons per status × persona
- `tests/unit/components/brief/red-flag-action-bar.test.tsx` — ack/snooze/threshold buttons fire correct actions; popovers open
- `tests/unit/components/brief/watch-toggle.test.tsx` — toggle posts setWatch / clearWatch
- `tests/unit/components/issuers/issuer-action-panel.test.tsx` — each action form submits and appends to request log
- `tests/unit/components/alerts/alert-rule-form.test.tsx` — condition/scope/action validation
- `tests/unit/components/alerts/alert-filter-bar.test.tsx` — filter chips toggle and update results

### E2E (Playwright)

One new spec, `tests/e2e/acred-action-layer.spec.ts`:

1. Sign in as demo counterparty.
2. Navigate to `/datasets/ds_acred`. Brief renders.
3. Click "Acknowledge" on a red flag → fill note → submit. Assert the flag disappears from the active scoreboard; assert it appears in the "Acknowledged" sub-list.
4. Click "Set threshold" on `acred.leverage_high` → slide to 90% → submit. Assert that flag drops (leverage is 73%, below the new threshold).
5. Click "Memo" tab. Land on `/datasets/ds_acred/memo`.
6. Type into Character section → autosave. Reload page → text persists.
7. Click "Insert data" in Capital → pick "Top-10 borrower exposure" → block renders with footnote.
8. In flag checklist, click Dismiss on a flag → fill reason → submit. Assert checklist updates.
9. Click "Submit for IC review". Assert status pill shows "Submitted". Re-sign-in as admin persona via role-switch.
10. Land on the same memo. Assert "Approve" button visible. Click it. Assert status flips to "Approved".
11. Sign back in as counterparty. Navigate to `/issuers`. Click Apollo row. Detail loads.
12. Click "Request weekly leverage attestation" → fill form → submit. Assert log adds an entry.
13. Navigate to `/alerts`. Feed shows events across the portfolio.
14. Switch to Rules tab → "Create rule" → fill condition/scope/action → save. Rule appears in list.
15. Click "Test rule". Assert a `test_*` synthetic event appears in Feed.
16. Switch to Channels tab → "Add Slack channel" → fill URL → save. Click "Send test event". Assert toast.
17. Console: zero `[descriptor-drift]` warnings; no React errors.

### Out of scope

- Visual regression / screenshot tests
- Cross-browser (chromium only)
- Performance budgets

## Risks and open questions

- **Last-write-wins on memo sections.** Two tabs editing the same memo's same section will lose the slower write. Acceptable for slice 2 since concurrent editing is unlikely in the demo; slice 3 will add OCC.
- **In-memory store loses state on dev-server restart.** Acceptable — matches notebooks/runs.
- **Threshold override semantics couple slice-1 rule library to slice-2 storage.** `evaluateAcredRedFlags` gains an optional `thresholds` param. Defaulting to `[]` keeps slice 1 callers byte-identical.
- **Memo "Insert data" runs DuckDB client-side.** Same constraint as the notebook slice: the methodology DSLs must execute against the live ACRED parquet. Init cost (~1–3s) is borne on first insert.
- **Sidebar badge unread state.** `lastVisitedAlerts` is per-user; in the in-memory store this resets on restart. Acceptable.
- **Persona switching mid-memo.** If a counterparty starts editing then the role-switch flips to admin, the memo status bar should re-render the admin actions. The page revalidates on persona change via the existing role-switch flow.
- **5-C section names.** Standard credit-memo vocabulary in TradFi. We adopt them verbatim — InfiniFi analysts will recognize them. No risk.

## Implementation order (input for writing-plans)

The slice is large but cleanly decomposes into 4 sequential bands plus a final integration band. Plan should preserve this order.

**Band A — Schemas + persistence layer (foundational)**
1. Add Decision-layer Zod types (`MemoStatus`, `MemoSection`, `Memo`, `FlagDecision`, `AcknowledgedFlag`, `DismissedAnomaly`, `Threshold`, `WatchEntry`, `IssuerRequest`, `IssuerCompliance`, `AlertChannel`, `AlertRule`).
2. Create `lib/api/fixtures/decisions.ts` with empty mutable stores + a single seeded draft memo for ACRED.
3. Seed 16 mocked anomaly events across the 4 peer datasets in `lib/data/acred/alerts-feed.ts` (4 events × 4 peers).
4. Add 3 mocked peer issuer fixtures to `lib/api/fixtures/orgs.ts` (`org_janus`, `org_fasanara_mgr`, `org_amsmgr`); attach `IssuerCompliance` to each.

**Band B — Endpoints + server actions**
5. `lib/api/endpoints/memos.ts` (6 endpoints).
6. `lib/api/endpoints/decisions.ts` (10 endpoints).
7. `lib/api/endpoints/issuers.ts` (4 endpoints).
8. `lib/api/endpoints/alerts.ts` (10 endpoints).
9. Update slice-1 endpoints: `getAcredBriefRedFlags` and `getAcredAnomalyFeed` accept filter args; `evaluateAcredRedFlags` accepts optional `thresholds`.
10. Server-action wrappers in `app/(app)/datasets/[datasetId]/memo/actions.ts`, `/issuers/actions.ts`, `/alerts/actions.ts`.

**Band C — UI building blocks**
11. Memo section building blocks: `<MemoSectionShell>`, `<MemoSectionEditor>`, `<MemoInsertPicker>`, `<MemoInsertBlock>`.
12. Memo composite: `<MemoEditor>`, `<MemoFlagChecklist>`, `<MemoStatusBar>`, `<MemoAuditLog>`.
13. Brief action affordances: `<RedFlagActionBar>`, `<ThresholdSliderPopover>`, `<AnomalyActionBar>`, `<WatchToggle>`.
14. Issuer building blocks: `<IssuerTable>`, `<IssuerDetailHeader>`, `<IssuerAssetRoster>`, `<IssuerSlaTable>`, `<IssuerActionPanel>`, `<IssuerRequestLog>`.
15. Alerts building blocks: `<AlertFilterBar>`, `<AlertFeed>`, `<AlertRuleList>`, `<AlertRuleForm>`, `<AlertChannelList>`, `<AlertChannelForm>`, `<AlertTestButton>`.

**Band D — Routes**
16. `/datasets/[datasetId]/memo` page + loading + integration with dataset layout tab.
17. Refactor `<RedFlagScoreboard>` and `<AnomalyFeed>` to compose `<RedFlagCard>` / `<AnomalyRow>` so slice-1 brief and slice-2 alerts feed share rendering.
18. Plug action bars into the brief (`<AcredBrief>` updates).
19. `<BriefHeader>` Watch toggle.
20. Sidebar nav entries for Issuers and Alerts.
21. `/issuers` list + `/issuers/[issuerId]` detail pages.
22. `/alerts` layout + `/alerts` (feed) + `/alerts/rules` + `/alerts/rules/new` + `/alerts/rules/[ruleId]` + `/alerts/channels`.

**Band E — Integration, tests, polish**
23. Unit tests for endpoints, components, and the threshold-override evaluator.
24. E2E spec covering the full action flow.
25. `npm run typecheck` / `npm run lint` / `npm test` / `npm run test:e2e` / `npm run build` clean.
26. Visual pass via `visual-fix` across the 4 new surfaces (memo, issuers list, issuers detail, alerts feed) — each gets one screenshot loop.

Plan should yield approximately 38–42 tasks once decomposed.
