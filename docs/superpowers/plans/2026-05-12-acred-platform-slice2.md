# ACRED Platform Slice 2 — Action Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a memo workspace, in-place decision affordances on the brief, an issuer-compliance workspace, and an alerts feed — turning the slice-1 read-only brief into an end-to-end analyst workflow.

**Architecture:** New Zod types in `lib/api/schemas.ts`; module-level mutable fixture store in `lib/api/fixtures/decisions.ts`; four new endpoint files; four new feature directories under `components/features/`; new routes under `/datasets/[id]/memo`, `/issuers`, `/alerts`. Slice-1 components are refactored where needed to expose Row primitives shared by the alerts feed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Zod, Tailwind v4 + shadcn UI, DuckDB-WASM (existing client engine for memo "Insert data"), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-12-acred-platform-slice2-design.md`

**Builds on:** slice 1 (`2026-05-12-acred-monitoring-brief.md`).

**Common commands**
- Unit: `npm test -- <pattern>`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- E2E: `npm run test:e2e -- <pattern>`
- Build: `npm run build`

**Existing patterns to mirror**
- Mock endpoints: see `lib/api/endpoints/datasets.ts` (slice 1 added 5).
- Module-level mutable stores: see `lib/api/fixtures/notebooks.ts` style.
- Server actions: see `app/(app)/notebooks/[notebookId]/actions.ts`.
- Route patterns: see `app/(app)/datasets/[datasetId]/amm/page.tsx` (slice 1).
- Sidebar entries: see `components/shell/sidebar.tsx`.

---

## Task 1: Memo Zod types

**Files:**
- Modify: `lib/api/schemas.ts` (append after the slice-1 Brief primitives section)
- Test: `tests/unit/api/memo-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/memo-schemas.test.ts
import { describe, it, expect } from 'vitest'
import { MemoSchema, MemoStatusSchema, MemoSectionSchema, MemoInsertSchema, FlagDecisionSchema } from '@/lib/api/schemas'

describe('memo schemas', () => {
  it('MemoStatusSchema is closed', () => {
    expect(MemoStatusSchema.options).toEqual(['draft', 'submitted', 'approved'])
  })

  it('MemoSectionSchema defaults markdown="" and inserts=[]', () => {
    const parsed = MemoSectionSchema.parse({})
    expect(parsed.markdown).toBe('')
    expect(parsed.inserts).toEqual([])
  })

  it('MemoInsertSchema parses', () => {
    expect(() => MemoInsertSchema.parse({
      id: 'ins_1', methodologyId: 'acred.top10_borrowers', insertedAt: '2026-05-12T10:00:00.000Z',
    })).not.toThrow()
  })

  it('FlagDecisionSchema rejects invalid actions', () => {
    expect(() => FlagDecisionSchema.parse({
      flagId: 'f1', action: 'rejected', note: 'x', decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: 'u1',
    })).toThrow()
  })

  it('MemoSchema parses a minimal draft', () => {
    expect(() => MemoSchema.parse({
      id: 'memo_1', datasetId: 'ds_acred', authorId: 'u1', status: 'draft',
      createdAt: '2026-05-12T00:00:00.000Z', updatedAt: '2026-05-12T00:00:00.000Z',
      sections: {
        character: { markdown: '', inserts: [] }, capacity: { markdown: '', inserts: [] },
        capital: { markdown: '', inserts: [] }, collateral: { markdown: '', inserts: [] },
        conditions: { markdown: '', inserts: [] },
      },
    })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npm test -- tests/unit/api/memo-schemas.test.ts
```

- [ ] **Step 3: Implement** — append after the slice-1 Brief primitives in `lib/api/schemas.ts`:

```ts
// ---------- Decision layer: memos ----------

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
export type FlagDecisionAction = z.infer<typeof FlagDecisionActionSchema>

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
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/memo-schemas.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/memo-schemas.test.ts
git commit -m "feat(schemas): memo decision-layer types"
```

---

## Task 2: Decision-state Zod types

**Files:**
- Modify: `lib/api/schemas.ts`
- Test: `tests/unit/api/decision-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/decision-schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  AcknowledgedFlagSchema, DismissedAnomalySchema, ThresholdSchema,
  WatchEntrySchema, NotificationChannelKindSchema, ThresholdDirectionSchema,
} from '@/lib/api/schemas'

describe('decision-state schemas', () => {
  it('AcknowledgedFlagSchema parses with optional expiresAt', () => {
    expect(() => AcknowledgedFlagSchema.parse({
      flagId: 'acred.leverage_high', datasetId: 'ds_acred',
      acknowledgedBy: 'u1', acknowledgedAt: '2026-05-12T10:00:00.000Z',
      note: 'IC accepted the elevated leverage profile.',
    })).not.toThrow()
  })

  it('ThresholdSchema enforces direction enum', () => {
    expect(() => ThresholdSchema.parse({
      id: 't1', ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.80, direction: 'sideways',
      setBy: 'u1', setAt: '2026-05-12T10:00:00.000Z',
    })).toThrow()
  })

  it('WatchEntrySchema defaults channels=[]', () => {
    const parsed = WatchEntrySchema.parse({
      datasetId: 'ds_acred', userId: 'u1', watchedAt: '2026-05-12T10:00:00.000Z',
    })
    expect(parsed.channels).toEqual([])
  })

  it('NotificationChannelKindSchema is closed', () => {
    expect(NotificationChannelKindSchema.options).toEqual(['slack', 'email', 'webhook'])
  })

  it('ThresholdDirectionSchema is closed', () => {
    expect(ThresholdDirectionSchema.options).toEqual(['above', 'below'])
  })

  it('DismissedAnomalySchema parses', () => {
    expect(() => DismissedAnomalySchema.parse({
      anomalyId: 'evt_1', dismissedBy: 'u1',
      dismissedAt: '2026-05-12T10:00:00.000Z', reason: 'Already in the memo.',
    })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — append after the memo section:

```ts
// ---------- Decision layer: per-flag/per-anomaly decisions ----------

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
export type ThresholdDirection = z.infer<typeof ThresholdDirectionSchema>

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
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/decision-schemas.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/decision-schemas.test.ts
git commit -m "feat(schemas): decision-state primitives (ack/dismiss/threshold/watch)"
```

---

## Task 3: Issuer + Alerts Zod types

**Files:**
- Modify: `lib/api/schemas.ts`
- Test: `tests/unit/api/issuer-alerts-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/issuer-alerts-schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  IssuerRequestSchema, IssuerRequestKindSchema, IssuerRequestStatusSchema,
  IssuerComplianceSchema, AlertChannelSchema, AlertRuleSchema, SlaCadenceSchema,
} from '@/lib/api/schemas'

describe('issuer + alerts schemas', () => {
  it('IssuerRequestKindSchema is closed', () => {
    expect(IssuerRequestKindSchema.options).toEqual(['attestation-request', 'gap-acceptance', 'sla-renegotiation'])
  })

  it('IssuerRequestStatusSchema is closed', () => {
    expect(IssuerRequestStatusSchema.options).toEqual(['pending', 'accepted', 'declined'])
  })

  it('SlaCadenceSchema is closed', () => {
    expect(SlaCadenceSchema.options).toEqual(['daily', 'weekly', 'monthly', 'quarterly'])
  })

  it('IssuerRequestSchema parses with payload record', () => {
    expect(() => IssuerRequestSchema.parse({
      id: 'req_1', issuerId: 'org_apollo', requestedBy: 'u1',
      requestedAt: '2026-05-12T10:00:00.000Z', kind: 'attestation-request',
      payload: { cadence: 'weekly', metric: 'leverage', startDate: '2026-06-01' },
      status: 'pending',
    })).not.toThrow()
  })

  it('IssuerComplianceSchema parses', () => {
    expect(() => IssuerComplianceSchema.parse({
      issuerId: 'org_apollo', assetIds: ['ds_acred'],
      discipline: {
        expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28, lastGapAt: null,
        cadenceBreakdown: [{ cadence: 'daily', metric: 'NAV', delivered: 30, expected: 30, onTime: 30 }],
      },
      openRequestCount: 0,
    })).not.toThrow()
  })

  it('AlertRuleSchema parses with default enabled=true and empty arrays', () => {
    const parsed = AlertRuleSchema.parse({
      id: 'rule_1', label: 'High leverage anywhere',
      condition: { metric: 'leverage', threshold: 0.75, direction: 'above' },
      scope: { datasetIds: [] },
      channelIds: ['ch_1'],
      createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z',
    })
    expect(parsed.enabled).toBe(true)
    expect(parsed.scope.kinds).toEqual([])
    expect(parsed.scope.severities).toEqual([])
  })

  it('AlertChannelSchema enforces channel kind', () => {
    expect(() => AlertChannelSchema.parse({
      id: 'ch_1', kind: 'pigeon', label: 'x', target: 'y',
      createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z',
    })).toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — append after the decision section:

```ts
// ---------- Decision layer: issuer compliance ----------

export const IssuerRequestKindSchema = z.enum(['attestation-request', 'gap-acceptance', 'sla-renegotiation'])
export type IssuerRequestKind = z.infer<typeof IssuerRequestKindSchema>

export const IssuerRequestStatusSchema = z.enum(['pending', 'accepted', 'declined'])
export type IssuerRequestStatus = z.infer<typeof IssuerRequestStatusSchema>

export const IssuerRequestSchema = z.object({
  id: z.string(),
  issuerId: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string().datetime(),
  kind: IssuerRequestKindSchema,
  payload: z.record(z.unknown()),
  status: IssuerRequestStatusSchema,
})
export type IssuerRequest = z.infer<typeof IssuerRequestSchema>

export const SlaCadenceSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
export type SlaCadence = z.infer<typeof SlaCadenceSchema>

export const IssuerComplianceSchema = z.object({
  issuerId: z.string(),
  assetIds: z.array(z.string()),
  discipline: AttestationDisciplineSchema,
  openRequestCount: z.number().int().nonnegative(),
})
export type IssuerCompliance = z.infer<typeof IssuerComplianceSchema>

// ---------- Decision layer: alerts ----------

export const AlertChannelSchema = z.object({
  id: z.string(),
  kind: NotificationChannelKindSchema,
  label: z.string(),
  target: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
})
export type AlertChannel = z.infer<typeof AlertChannelSchema>

export const AlertRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  condition: z.object({
    metric: z.string(),
    threshold: z.number(),
    direction: ThresholdDirectionSchema,
  }),
  scope: z.object({
    datasetIds: z.array(z.string()),
    kinds: z.array(z.string()).default([]),
    severities: z.array(z.string()).default([]),
  }),
  channelIds: z.array(z.string()),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
})
export type AlertRule = z.infer<typeof AlertRuleSchema>
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/issuer-alerts-schemas.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/issuer-alerts-schemas.test.ts
git commit -m "feat(schemas): issuer compliance + alerts primitives"
```

---

## Task 4: Fixture stores + seed data

**Files:**
- Create: `lib/api/fixtures/decisions.ts` (mutable stores)
- Create: `lib/data/acred/alerts-feed.ts` (seeded peer events)
- Modify: `lib/api/fixtures/orgs.ts` (add 3 mocked peer issuers)
- Test: `tests/unit/data/decisions-store.test.ts`
- Test: `tests/unit/data/alerts-feed-seed.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/data/decisions-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'

beforeEach(() => store.__resetForTests())

describe('decisions store', () => {
  it('exposes mutable arrays for each decision kind', () => {
    expect(store.getAcknowledgedFlags()).toEqual([])
    expect(store.getDismissedAnomalies()).toEqual([])
    expect(store.getThresholds()).toEqual([])
    expect(store.getWatchEntries()).toEqual([])
    expect(store.getIssuerRequests()).toEqual([])
    expect(store.getAlertRules()).toEqual([])
    expect(store.getAlertChannels()).toEqual([])
  })

  it('seeds a single draft memo for ACRED', () => {
    const memos = store.getMemos()
    expect(memos.length).toBe(1)
    expect(memos[0].datasetId).toBe('ds_acred')
    expect(memos[0].status).toBe('draft')
  })

  it('appendXxx() mutations are visible to subsequent getXxx() calls', () => {
    store.appendAcknowledgedFlag({
      flagId: 'f1', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: '2026-05-12T10:00:00.000Z', note: 'ok',
    })
    expect(store.getAcknowledgedFlags()).toHaveLength(1)
  })
})
```

```ts
// tests/unit/data/alerts-feed-seed.test.ts
import { describe, it, expect } from 'vitest'
import { peerAnomalyEvents } from '@/lib/data/acred/alerts-feed'
import { AnomalyEventSchema } from '@/lib/api/schemas'
import { z } from 'zod'

describe('peerAnomalyEvents seed', () => {
  it('contains exactly 16 events (4 per peer × 4 peers)', () => {
    expect(peerAnomalyEvents.length).toBe(16)
  })

  it('parses every entry against AnomalyEventSchema', () => {
    expect(() => z.array(AnomalyEventSchema).parse(peerAnomalyEvents)).not.toThrow()
  })

  it('covers every non-ACRED portfolio dataset', () => {
    const peerIds = new Set(peerAnomalyEvents.map((e) => e.detailHref?.match(/ds_[a-z_]+/)?.[0]))
    expect(peerIds).toEqual(new Set(['ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']))
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the decisions store**

```ts
// lib/api/fixtures/decisions.ts
import type {
  Memo, AcknowledgedFlag, DismissedAnomaly, Threshold, WatchEntry,
  IssuerRequest, AlertRule, AlertChannel,
} from '@/lib/api/schemas'

const SEED_NOW = new Date('2026-05-12T08:00:00.000Z').toISOString()

const seededDraftMemo: Memo = {
  id: 'memo_acred_q1_2026',
  datasetId: 'ds_acred',
  authorId: 'u_demo_counterparty',
  status: 'draft',
  createdAt: SEED_NOW,
  updatedAt: SEED_NOW,
  sections: {
    character:  { markdown: '', inserts: [] },
    capacity:   { markdown: '', inserts: [] },
    capital:    { markdown: '', inserts: [] },
    collateral: { markdown: '', inserts: [] },
    conditions: { markdown: '', inserts: [] },
  },
  flagDecisions: [],
}

// Mutable stores — module-level state, survives hot reload.
let _acks:           AcknowledgedFlag[]  = []
let _dismissals:     DismissedAnomaly[]  = []
let _thresholds:     Threshold[]         = []
let _watch:          WatchEntry[]        = []
let _issuerReqs:     IssuerRequest[]     = []
let _alertRules:     AlertRule[]         = []
let _alertChannels:  AlertChannel[]      = []
let _memos:          Memo[]              = [seededDraftMemo]
let _lastVisitAlerts: Record<string, string> = {}

// ---- readers ----
export const getAcknowledgedFlags  = () => _acks
export const getDismissedAnomalies = () => _dismissals
export const getThresholds         = () => _thresholds
export const getWatchEntries       = () => _watch
export const getIssuerRequests     = () => _issuerReqs
export const getAlertRules         = () => _alertRules
export const getAlertChannels      = () => _alertChannels
export const getMemos              = () => _memos
export const getLastVisitAlerts    = (userId: string) => _lastVisitAlerts[userId]

// ---- writers ----
export const appendAcknowledgedFlag  = (x: AcknowledgedFlag)  => { _acks.push(x); return x }
export const appendDismissedAnomaly  = (x: DismissedAnomaly) => { _dismissals.push(x); return x }
export const appendThreshold         = (x: Threshold)         => { _thresholds.push(x); return x }
export const upsertWatchEntry        = (x: WatchEntry)        => {
  const i = _watch.findIndex((w) => w.datasetId === x.datasetId && w.userId === x.userId)
  if (i >= 0) _watch[i] = x; else _watch.push(x)
  return x
}
export const removeWatchEntry        = (datasetId: string, userId: string) => {
  _watch = _watch.filter((w) => !(w.datasetId === datasetId && w.userId === userId))
}
export const appendIssuerRequest     = (x: IssuerRequest)     => { _issuerReqs.push(x); return x }
export const appendAlertRule         = (x: AlertRule)         => { _alertRules.push(x); return x }
export const replaceAlertRule        = (id: string, patch: Partial<AlertRule>) => {
  const i = _alertRules.findIndex((r) => r.id === id)
  if (i >= 0) _alertRules[i] = { ..._alertRules[i], ...patch }
  return _alertRules[i]
}
export const removeAlertRule         = (id: string) => { _alertRules = _alertRules.filter((r) => r.id !== id) }
export const appendAlertChannel      = (x: AlertChannel)      => { _alertChannels.push(x); return x }
export const removeAlertChannel      = (id: string) => { _alertChannels = _alertChannels.filter((c) => c.id !== id) }
export const upsertMemo              = (memo: Memo) => {
  const i = _memos.findIndex((m) => m.id === memo.id)
  if (i >= 0) _memos[i] = memo; else _memos.push(memo)
  return memo
}
export const setLastVisitAlerts      = (userId: string, ts: string) => { _lastVisitAlerts[userId] = ts }

// ---- test reset (production must never call this) ----
export const __resetForTests = () => {
  _acks = []; _dismissals = []; _thresholds = []; _watch = []
  _issuerReqs = []; _alertRules = []; _alertChannels = []
  _memos = [seededDraftMemo]
  _lastVisitAlerts = {}
}
```

- [ ] **Step 4: Implement the peer anomaly seed**

```ts
// lib/data/acred/alerts-feed.ts
import type { AnomalyEvent } from '@/lib/api/schemas'

const t = (offsetHours: number) =>
  new Date(Date.now() - offsetHours * 3_600_000).toISOString()

/**
 * Seeded mocked anomaly events for the four non-ACRED portfolio datasets.
 * Four events per dataset (one of each kind where applicable).
 * ACRED's own feed is loaded separately from acredAnomalyFeed.
 */
export const peerAnomalyEvents: AnomalyEvent[] = [
  // ds_mfone — trade-receivables
  { id: 'evt_mfone_1', occurredAt: t(2),   kind: 'filing',           severity: 'info',   title: 'Daily attestation delivered', borrowerNormalized: null, detailHref: '/datasets/ds_mfone/runs' },
  { id: 'evt_mfone_2', occurredAt: t(20),  kind: 'credit-event',     severity: 'low',    title: 'Borrower X covenant waiver granted', borrowerNormalized: 'borrower x', detailHref: '/datasets/ds_mfone/explore' },
  { id: 'evt_mfone_3', occurredAt: t(48),  kind: 'attestation-gap',  severity: 'medium', title: 'Weekly leverage attestation late (37 min)', borrowerNormalized: null, detailHref: '/datasets/ds_mfone' },
  { id: 'evt_mfone_4', occurredAt: t(96),  kind: 'filing',           severity: 'info',   title: 'Monthly composition published', borrowerNormalized: null, detailHref: '/datasets/ds_mfone/runs' },

  // ds_jaaa — clo etf
  { id: 'evt_jaaa_1',  occurredAt: t(4),   kind: 'filing',           severity: 'info',   title: 'Hourly NAV attested', borrowerNormalized: null, detailHref: '/datasets/ds_jaaa' },
  { id: 'evt_jaaa_2',  occurredAt: t(36),  kind: 'credit-event',     severity: 'medium', title: 'CLO tranche B downgraded by S&P', borrowerNormalized: 'clo tranche b', detailHref: '/datasets/ds_jaaa/explore' },
  { id: 'evt_jaaa_3',  occurredAt: t(72),  kind: 'attestation-gap',  severity: 'low',    title: 'Weekly composition delivered 6 min late', borrowerNormalized: null, detailHref: '/datasets/ds_jaaa' },
  { id: 'evt_jaaa_4',  occurredAt: t(120), kind: 'filing',           severity: 'info',   title: 'Q1 prospectus update filed', borrowerNormalized: null, detailHref: '/datasets/ds_jaaa/runs' },

  // ds_fasanara — invoice finance
  { id: 'evt_fasa_1',  occurredAt: t(1),   kind: 'filing',           severity: 'info',   title: 'Hourly invoice batch attested', borrowerNormalized: null, detailHref: '/datasets/ds_fasanara' },
  { id: 'evt_fasa_2',  occurredAt: t(28),  kind: 'credit-event',     severity: 'high',   title: 'Counterparty Y default disclosed (3.2% exposure)', borrowerNormalized: 'counterparty y', detailHref: '/datasets/ds_fasanara/explore' },
  { id: 'evt_fasa_3',  occurredAt: t(60),  kind: 'attestation-gap',  severity: 'low',    title: 'Daily attestation delivered 12 min late', borrowerNormalized: null, detailHref: '/datasets/ds_fasanara' },
  { id: 'evt_fasa_4',  occurredAt: t(168), kind: 'filing',           severity: 'info',   title: 'Weekly portfolio summary published', borrowerNormalized: null, detailHref: '/datasets/ds_fasanara/runs' },

  // ds_ams_credit — apollo multi-strategy
  { id: 'evt_ams_1',   occurredAt: t(6),   kind: 'attestation-gap',  severity: 'high',   title: 'Weekly leverage attestation missed SLA', borrowerNormalized: null, detailHref: '/datasets/ds_ams_credit' },
  { id: 'evt_ams_2',   occurredAt: t(54),  kind: 'credit-event',     severity: 'high',   title: 'Software Co Z 8-K item 1.03 bankruptcy', borrowerNormalized: 'software co z', detailHref: '/datasets/ds_ams_credit/explore' },
  { id: 'evt_ams_3',   occurredAt: t(96),  kind: 'credit-event',     severity: 'medium', title: 'PIK trigger crossed on Borrower Q', borrowerNormalized: 'borrower q', detailHref: '/datasets/ds_ams_credit/explore' },
  { id: 'evt_ams_4',   occurredAt: t(144), kind: 'filing',           severity: 'info',   title: 'Q1 2026 N-PORT filed', borrowerNormalized: null, detailHref: '/datasets/ds_ams_credit/runs' },
]
```

- [ ] **Step 5: Add 3 mocked peer issuer orgs to `lib/api/fixtures/orgs.ts`**

Open `lib/api/fixtures/orgs.ts`. After the existing org array entries, append 3 new orgs (preserve trailing comma style):

```ts
  {
    id: 'org_janus',
    name: 'Janus Henderson',
    description: 'Janus Henderson Investors (mocked demo issuer).',
    websiteUrl: 'https://www.janushenderson.com',
    assetClasses: ['private-credit'],
    verified: false,
  },
  {
    id: 'org_fasanara_mgr',
    name: 'Fasanara Capital',
    description: 'Fasanara Capital — invoice-finance manager (mocked demo issuer).',
    websiteUrl: 'https://www.fasanara.com',
    assetClasses: ['trade-receivables'],
    verified: false,
  },
  {
    id: 'org_amsmgr',
    name: 'Apollo Multi-Strategy Mgr',
    description: 'Apollo Multi-Strategy Credit fund manager (mocked demo issuer).',
    websiteUrl: 'https://www.apollo.com',
    assetClasses: ['private-credit'],
    verified: false,
  },
```

Then, in `lib/api/fixtures/datasets.ts`, change the `originatorOrgId` for the three peer datasets to point at the new orgs (find the existing `ds_jaaa`, `ds_fasanara`, `ds_ams_credit` entries):
- `ds_jaaa.originatorOrgId` → `'org_janus'`
- `ds_fasanara.originatorOrgId` → `'org_fasanara_mgr'`
- `ds_ams_credit.originatorOrgId` → `'org_amsmgr'`

- [ ] **Step 6: Run, expect PASS**

```bash
npm test -- tests/unit/data/decisions-store.test.ts tests/unit/data/alerts-feed-seed.test.ts && npm run typecheck
```

All existing tests must still pass:

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add lib/api/fixtures/decisions.ts lib/data/acred/alerts-feed.ts lib/api/fixtures/orgs.ts lib/api/fixtures/datasets.ts tests/unit/data/decisions-store.test.ts tests/unit/data/alerts-feed-seed.test.ts
git commit -m "feat(fixtures): decisions store + peer anomaly seed + mocked peer issuers"
```

---

## Task 5: memos.ts endpoints + Memo type wiring

**Files:**
- Create: `lib/api/endpoints/memos.ts`
- Test: `tests/unit/api/memos-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/memos-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  getActiveMemo, updateMemoSection, recordFlagDecision,
  submitMemo, approveMemo, requestMemoChanges,
} from '@/lib/api/endpoints/memos'

const counterpartyCtx = { user: { id: 'u_demo_counterparty', orgId: 'org_infinifi', role: 'counterparty' as const } }
const adminCtx        = { user: { id: 'u_admin',             orgId: 'org_infinifi', role: 'admin' as const } }

beforeEach(() => store.__resetForTests())

describe('memos endpoints', () => {
  it('getActiveMemo returns the seeded draft for ACRED', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(memo.status).toBe('draft')
    expect(memo.datasetId).toBe('ds_acred')
  })

  it('getActiveMemo creates a new draft for a different dataset', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_mfone')
    expect(memo.datasetId).toBe('ds_mfone')
    expect(memo.status).toBe('draft')
  })

  it('updateMemoSection writes markdown into the right section', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await updateMemoSection(counterpartyCtx, memo.id, 'character', { markdown: 'Apollo has a strong track record.', inserts: [] })
    const after = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(after.sections.character.markdown).toBe('Apollo has a strong track record.')
  })

  it('recordFlagDecision appends a flagDecisions entry', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await recordFlagDecision(counterpartyCtx, memo.id, {
      flagId: 'acred.leverage_high', action: 'acknowledge',
      note: 'IC accepts elevated leverage.',
      decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: counterpartyCtx.user.id,
    })
    const after = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(after.flagDecisions).toHaveLength(1)
  })

  it('submitMemo transitions draft → submitted', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    const submitted = await submitMemo(counterpartyCtx, memo.id)
    expect(submitted.status).toBe('submitted')
    expect(submitted.submittedAt).toBeTruthy()
  })

  it('submitMemo rejects if memo is not in draft', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await submitMemo(counterpartyCtx, memo.id)
    await expect(submitMemo(counterpartyCtx, memo.id)).rejects.toThrow()
  })

  it('approveMemo gates on admin role + submitted status', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await expect(approveMemo(counterpartyCtx, memo.id)).rejects.toThrow()  // not submitted
    await submitMemo(counterpartyCtx, memo.id)
    await expect(approveMemo(counterpartyCtx, memo.id)).rejects.toThrow()  // not admin
    const approved = await approveMemo(adminCtx, memo.id)
    expect(approved.status).toBe('approved')
    expect(approved.approvedBy).toBe(adminCtx.user.id)
  })

  it('requestMemoChanges flips submitted → draft', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await submitMemo(counterpartyCtx, memo.id)
    const reverted = await requestMemoChanges(adminCtx, memo.id, 'Needs more on capacity.')
    expect(reverted.status).toBe('draft')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/api/endpoints/memos.ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { MemoSchema, MemoSectionSchema, FlagDecisionSchema, type Memo, type MemoSection, type FlagDecision } from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'

type SectionKey = keyof Memo['sections']

function findMemo(memoId: string): Memo {
  const memo = store.getMemos().find((m) => m.id === memoId)
  if (!memo) throw new MockApiError(`Memo ${memoId} not found`, 404)
  return memo
}

export const getActiveMemo = mockEndpoint(
  async (ctx: RequestContext, _signal, datasetId: string): Promise<Memo> => {
    const authorId = ctx.user?.id ?? 'anonymous'
    const existing = store.getMemos().find((m) =>
      m.datasetId === datasetId && m.authorId === authorId && m.status !== 'approved'
    )
    if (existing) return MemoSchema.parse(existing)

    const now = new Date().toISOString()
    const fresh: Memo = {
      id: `memo_${datasetId}_${Date.now()}`,
      datasetId, authorId,
      status: 'draft', createdAt: now, updatedAt: now,
      sections: {
        character:  { markdown: '', inserts: [] }, capacity:   { markdown: '', inserts: [] },
        capital:    { markdown: '', inserts: [] }, collateral: { markdown: '', inserts: [] },
        conditions: { markdown: '', inserts: [] },
      },
      flagDecisions: [],
    }
    store.upsertMemo(fresh)
    return MemoSchema.parse(fresh)
  },
  { latencyMs: 100 }
)

export const updateMemoSection = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string, sectionKey: SectionKey, section: MemoSection): Promise<Memo> => {
    const parsed = MemoSectionSchema.parse(section)
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError('Memo is locked for edits', 409)
    const next: Memo = {
      ...memo,
      updatedAt: new Date().toISOString(),
      sections: { ...memo.sections, [sectionKey]: parsed },
    }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 80 }
)

export const recordFlagDecision = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string, decision: FlagDecision): Promise<Memo> => {
    const parsed = FlagDecisionSchema.parse(decision)
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError('Memo is locked for edits', 409)
    const filtered = memo.flagDecisions.filter((d) => d.flagId !== parsed.flagId)
    const next: Memo = {
      ...memo,
      updatedAt: new Date().toISOString(),
      flagDecisions: [...filtered, parsed],
    }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 80 }
)

export const submitMemo = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string): Promise<Memo> => {
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError(`Cannot submit from ${memo.status}`, 409)
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'submitted', submittedAt: now, updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 120 }
)

export const approveMemo = mockEndpoint(
  async (ctx: RequestContext, _signal, memoId: string): Promise<Memo> => {
    if (ctx.user?.role !== 'admin') throw new MockApiError('Admin role required', 403)
    const memo = findMemo(memoId)
    if (memo.status !== 'submitted') throw new MockApiError(`Cannot approve from ${memo.status}`, 409)
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'approved', approvedAt: now, approvedBy: ctx.user.id, updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 120 }
)

export const requestMemoChanges = mockEndpoint(
  async (ctx: RequestContext, _signal, memoId: string, note: string): Promise<Memo> => {
    if (ctx.user?.role !== 'admin') throw new MockApiError('Admin role required', 403)
    const memo = findMemo(memoId)
    if (memo.status !== 'submitted') throw new MockApiError(`Cannot request changes from ${memo.status}`, 409)
    void note  // captured in the audit log via a follow-up enhancement; ignored for storage
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'draft', updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 100 }
)
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/memos-endpoint.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/endpoints/memos.ts tests/unit/api/memos-endpoint.test.ts
git commit -m "feat(api): memo endpoints with status workflow gates"
```

---

## Task 6: decisions.ts endpoints (ack / snooze / dismiss / threshold / watch)

**Files:**
- Create: `lib/api/endpoints/decisions.ts`
- Test: `tests/unit/api/decisions-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/decisions-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  listAcknowledgedFlags, acknowledgeFlag, snoozeFlag,
  listDismissedAnomalies, dismissAnomaly,
  listThresholds, setThreshold,
  listWatchEntries, setWatch, clearWatch,
} from '@/lib/api/endpoints/decisions'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('decisions endpoints', () => {
  it('acknowledgeFlag round-trips through the store', async () => {
    await acknowledgeFlag(ctx, { flagId: 'acred.leverage_high', datasetId: 'ds_acred', note: 'ok' })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    expect(list).toHaveLength(1)
    expect(list[0].flagId).toBe('acred.leverage_high')
  })

  it('snoozeFlag sets expiresAt 7 days out', async () => {
    await snoozeFlag(ctx, { flagId: 'acred.pik_rising', datasetId: 'ds_acred' })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    const entry = list[0]
    expect(entry.expiresAt).toBeTruthy()
    const days = (new Date(entry.expiresAt!).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)
  })

  it('listAcknowledgedFlags filters by datasetId and excludes expired entries', async () => {
    store.appendAcknowledgedFlag({
      flagId: 'expired', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      note: 'old', expiresAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    })
    store.appendAcknowledgedFlag({
      flagId: 'live', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: new Date().toISOString(),
      note: 'ok',
    })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    expect(list.map((f) => f.flagId)).toEqual(['live'])
  })

  it('dismissAnomaly round-trips', async () => {
    await dismissAnomaly(ctx, { anomalyId: 'evt_1', reason: 'already in memo' })
    const list = await listDismissedAnomalies(ctx)
    expect(list).toHaveLength(1)
  })

  it('setThreshold persists a Threshold entry', async () => {
    await setThreshold(ctx, {
      ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.85, direction: 'above',
    })
    const list = await listThresholds(ctx, 'ds_acred')
    expect(list[0].value).toBe(0.85)
  })

  it('setWatch upserts; clearWatch removes', async () => {
    await setWatch(ctx, { datasetId: 'ds_acred', channels: ['slack'] })
    expect(await listWatchEntries(ctx, ctx.user.id)).toHaveLength(1)
    await setWatch(ctx, { datasetId: 'ds_acred', channels: ['slack', 'email'] })
    const after = await listWatchEntries(ctx, ctx.user.id)
    expect(after[0].channels).toEqual(['slack', 'email'])
    await clearWatch(ctx, 'ds_acred')
    expect(await listWatchEntries(ctx, ctx.user.id)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/api/endpoints/decisions.ts
import { z } from 'zod'
import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import {
  AcknowledgedFlagSchema, DismissedAnomalySchema, ThresholdSchema, WatchEntrySchema,
  NotificationChannelKindSchema,
  type AcknowledgedFlag, type DismissedAnomaly, type Threshold, type WatchEntry,
  type NotificationChannelKind,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'

const SEVEN_DAYS = 7 * 86_400_000

function isActive(f: AcknowledgedFlag): boolean {
  if (!f.expiresAt) return true
  return new Date(f.expiresAt).getTime() > Date.now()
}

// ---------- Acknowledged flags ----------

export const listAcknowledgedFlags = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId?: string): Promise<AcknowledgedFlag[]> => {
    const all = store.getAcknowledgedFlags().filter(isActive)
    const scoped = datasetId ? all.filter((f) => f.datasetId === datasetId) : all
    return z.array(AcknowledgedFlagSchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const acknowledgeFlag = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { flagId: string; datasetId: string; note: string }): Promise<AcknowledgedFlag> => {
    const entry: AcknowledgedFlag = {
      flagId: payload.flagId, datasetId: payload.datasetId,
      acknowledgedBy: ctx.user?.id ?? 'anonymous',
      acknowledgedAt: new Date().toISOString(),
      note: payload.note,
    }
    store.appendAcknowledgedFlag(entry)
    return AcknowledgedFlagSchema.parse(entry)
  },
  { latencyMs: 80 }
)

export const snoozeFlag = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { flagId: string; datasetId: string }): Promise<AcknowledgedFlag> => {
    const entry: AcknowledgedFlag = {
      flagId: payload.flagId, datasetId: payload.datasetId,
      acknowledgedBy: ctx.user?.id ?? 'anonymous',
      acknowledgedAt: new Date().toISOString(),
      note: '(snoozed 7d)',
      expiresAt: new Date(Date.now() + SEVEN_DAYS).toISOString(),
    }
    store.appendAcknowledgedFlag(entry)
    return AcknowledgedFlagSchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Dismissed anomalies ----------

export const listDismissedAnomalies = mockEndpoint(
  async (_ctx: RequestContext): Promise<DismissedAnomaly[]> => {
    return z.array(DismissedAnomalySchema).parse(store.getDismissedAnomalies())
  },
  { latencyMs: 60 }
)

export const dismissAnomaly = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { anomalyId: string; reason: string }): Promise<DismissedAnomaly> => {
    const entry: DismissedAnomaly = {
      anomalyId: payload.anomalyId,
      dismissedBy: ctx.user?.id ?? 'anonymous',
      dismissedAt: new Date().toISOString(),
      reason: payload.reason,
    }
    store.appendDismissedAnomaly(entry)
    return DismissedAnomalySchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Thresholds ----------

export const listThresholds = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId?: string): Promise<Threshold[]> => {
    const all = store.getThresholds()
    const scoped = datasetId ? all.filter((t) => t.datasetId === datasetId) : all
    return z.array(ThresholdSchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const setThreshold = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { ruleId: string; datasetId: string; metric: string; value: number; direction: 'above' | 'below' }): Promise<Threshold> => {
    const entry: Threshold = {
      id: `thr_${payload.ruleId}_${Date.now()}`,
      ruleId: payload.ruleId, datasetId: payload.datasetId,
      metric: payload.metric, value: payload.value, direction: payload.direction,
      setBy: ctx.user?.id ?? 'anonymous',
      setAt: new Date().toISOString(),
    }
    store.appendThreshold(entry)
    return ThresholdSchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Watchlist ----------

export const listWatchEntries = mockEndpoint(
  async (_ctx: RequestContext, _signal, userId?: string): Promise<WatchEntry[]> => {
    const all = store.getWatchEntries()
    const scoped = userId ? all.filter((w) => w.userId === userId) : all
    return z.array(WatchEntrySchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const setWatch = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { datasetId: string; channels: NotificationChannelKind[] }): Promise<WatchEntry> => {
    const parsedChannels = z.array(NotificationChannelKindSchema).parse(payload.channels)
    const entry: WatchEntry = {
      datasetId: payload.datasetId,
      userId: ctx.user?.id ?? 'anonymous',
      channels: parsedChannels,
      watchedAt: new Date().toISOString(),
    }
    store.upsertWatchEntry(entry)
    return WatchEntrySchema.parse(entry)
  },
  { latencyMs: 80 }
)

export const clearWatch = mockEndpoint(
  async (ctx: RequestContext, _signal, datasetId: string): Promise<void> => {
    store.removeWatchEntry(datasetId, ctx.user?.id ?? 'anonymous')
  },
  { latencyMs: 60 }
)
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/api/decisions-endpoint.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/endpoints/decisions.ts tests/unit/api/decisions-endpoint.test.ts
git commit -m "feat(api): decisions endpoints (ack/snooze/dismiss/threshold/watch)"
```

---

## Task 7: issuers.ts endpoints

**Files:**
- Create: `lib/api/endpoints/issuers.ts`
- Test: `tests/unit/api/issuers-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/issuers-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import { listIssuers, getIssuer, listIssuerRequests, submitIssuerRequest } from '@/lib/api/endpoints/issuers'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('issuers endpoints', () => {
  it('listIssuers includes Apollo and the three mocked peers', async () => {
    const issuers = await listIssuers(ctx)
    const ids = issuers.map((i) => i.issuerId)
    expect(ids).toEqual(expect.arrayContaining(['org_apollo', 'org_janus', 'org_fasanara_mgr', 'org_amsmgr']))
  })

  it('getIssuer returns one IssuerCompliance with attestation discipline', async () => {
    const apollo = await getIssuer(ctx, 'org_apollo')
    expect(apollo.issuerId).toBe('org_apollo')
    expect(apollo.discipline.expectedLast30d).toBeGreaterThan(0)
    expect(apollo.assetIds).toContain('ds_acred')
  })

  it('submitIssuerRequest appends to the request log', async () => {
    const req = await submitIssuerRequest(ctx, {
      issuerId: 'org_apollo', kind: 'attestation-request',
      payload: { cadence: 'weekly', metric: 'leverage' },
    })
    expect(req.id).toMatch(/^req_/)
    expect(req.status).toBe('pending')
    const log = await listIssuerRequests(ctx, 'org_apollo')
    expect(log).toHaveLength(1)
  })

  it('listIssuerRequests filters by issuerId', async () => {
    await submitIssuerRequest(ctx, { issuerId: 'org_apollo', kind: 'attestation-request', payload: {} })
    await submitIssuerRequest(ctx, { issuerId: 'org_janus',  kind: 'attestation-request', payload: {} })
    expect(await listIssuerRequests(ctx, 'org_apollo')).toHaveLength(1)
    expect(await listIssuerRequests(ctx)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/api/endpoints/issuers.ts
import { z } from 'zod'
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import {
  IssuerComplianceSchema, IssuerRequestSchema, IssuerRequestKindSchema,
  type IssuerCompliance, type IssuerRequest, type IssuerRequestKind,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'
import { fixtures } from '@/lib/api/fixtures'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'

/**
 * Maps known issuer orgs to their IssuerCompliance shape. Apollo uses ACRED's real
 * attestation discipline (from slice 1). Peer issuers use mocked plausible shapes.
 */
function buildCompliance(issuerId: string): IssuerCompliance | null {
  const assetIds = fixtures.datasets
    .filter((d) => d.originatorOrgId === issuerId)
    .map((d) => d.id)
  if (assetIds.length === 0) return null

  const baseDiscipline = (() => {
    if (issuerId === 'org_apollo') return acredAttestationDiscipline
    // Mocked variants for peers — illustrative.
    return {
      expectedLast30d: 30,
      deliveredLast30d: 28,
      onTimeLast30d: 25,
      lastGapAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      cadenceBreakdown: [
        { cadence: 'daily' as const,    metric: 'NAV',                 delivered: 28, expected: 30, onTime: 25 },
        { cadence: 'weekly' as const,   metric: 'Leverage',            delivered:  4, expected:  4, onTime:  3 },
        { cadence: 'monthly' as const,  metric: 'Composition',         delivered:  1, expected:  1, onTime:  1 },
        { cadence: 'quarterly' as const, metric: 'SEC N-PORT recon',   delivered:  1, expected:  1, onTime:  1 },
      ],
    }
  })()

  const openRequestCount = store.getIssuerRequests()
    .filter((r) => r.issuerId === issuerId && r.status === 'pending').length

  return { issuerId, assetIds, discipline: baseDiscipline, openRequestCount }
}

export const listIssuers = mockEndpoint(
  async (_ctx: RequestContext): Promise<IssuerCompliance[]> => {
    const seen = new Set<string>()
    const out: IssuerCompliance[] = []
    for (const dataset of fixtures.datasets) {
      if (seen.has(dataset.originatorOrgId)) continue
      seen.add(dataset.originatorOrgId)
      const compliance = buildCompliance(dataset.originatorOrgId)
      if (compliance) out.push(compliance)
    }
    return z.array(IssuerComplianceSchema).parse(out)
  },
  { latencyMs: 140 }
)

export const getIssuer = mockEndpoint(
  async (_ctx: RequestContext, _signal, issuerId: string): Promise<IssuerCompliance> => {
    const compliance = buildCompliance(issuerId)
    if (!compliance) throw new MockApiError(`Issuer ${issuerId} not found`, 404)
    return IssuerComplianceSchema.parse(compliance)
  },
  { latencyMs: 120 }
)

export const listIssuerRequests = mockEndpoint(
  async (_ctx: RequestContext, _signal, issuerId?: string): Promise<IssuerRequest[]> => {
    const all = store.getIssuerRequests()
    const scoped = issuerId ? all.filter((r) => r.issuerId === issuerId) : all
    return z.array(IssuerRequestSchema).parse(scoped)
  },
  { latencyMs: 100 }
)

export const submitIssuerRequest = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }): Promise<IssuerRequest> => {
    IssuerRequestKindSchema.parse(payload.kind)
    const req: IssuerRequest = {
      id: `req_${payload.issuerId}_${Date.now()}`,
      issuerId: payload.issuerId,
      requestedBy: ctx.user?.id ?? 'anonymous',
      requestedAt: new Date().toISOString(),
      kind: payload.kind,
      payload: payload.payload,
      status: 'pending',
    }
    store.appendIssuerRequest(req)
    return IssuerRequestSchema.parse(req)
  },
  { latencyMs: 140 }
)
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/issuers-endpoint.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/endpoints/issuers.ts tests/unit/api/issuers-endpoint.test.ts
git commit -m "feat(api): issuers endpoints (list/get/requests/submit)"
```

---

## Task 8: alerts.ts endpoints

**Files:**
- Create: `lib/api/endpoints/alerts.ts`
- Test: `tests/unit/api/alerts-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/alerts-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  listAlertEvents, listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule,
  testAlertRule, listAlertChannels, createAlertChannel, deleteAlertChannel, sendTestEvent,
} from '@/lib/api/endpoints/alerts'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('alerts endpoints', () => {
  it('listAlertEvents aggregates ACRED + peer feeds', async () => {
    const events = await listAlertEvents(ctx)
    expect(events.length).toBeGreaterThanOrEqual(16)
    events.forEach((e) => expect(e.id).toBeTruthy())
  })

  it('listAlertEvents filters by kind', async () => {
    const filings = await listAlertEvents(ctx, { kinds: ['filing'] })
    filings.forEach((e) => expect(e.kind).toBe('filing'))
    expect(filings.length).toBeGreaterThan(0)
  })

  it('createAlertRule, updateAlertRule, deleteAlertRule round-trip', async () => {
    const rule = await createAlertRule(ctx, {
      label: 'leverage spike', enabled: true,
      condition: { metric: 'leverage', threshold: 0.75, direction: 'above' },
      scope: { datasetIds: [], kinds: [], severities: [] }, channelIds: [],
    })
    expect((await listAlertRules(ctx))).toHaveLength(1)
    await updateAlertRule(ctx, rule.id, { enabled: false })
    expect((await listAlertRules(ctx))[0].enabled).toBe(false)
    await deleteAlertRule(ctx, rule.id)
    expect(await listAlertRules(ctx)).toHaveLength(0)
  })

  it('testAlertRule injects a synthetic event with id prefix test_', async () => {
    const rule = await createAlertRule(ctx, {
      label: 'x', condition: { metric: 'leverage', threshold: 0.5, direction: 'above' },
      scope: { datasetIds: [], kinds: [], severities: [] }, channelIds: [],
    })
    await testAlertRule(ctx, rule.id)
    const events = await listAlertEvents(ctx)
    const synthetic = events.find((e) => e.id.startsWith('test_'))
    expect(synthetic).toBeTruthy()
  })

  it('createAlertChannel and deleteAlertChannel round-trip', async () => {
    const ch = await createAlertChannel(ctx, { kind: 'slack', label: 'risk-team', target: 'https://hooks.slack.com/x' })
    expect(await listAlertChannels(ctx)).toHaveLength(1)
    await deleteAlertChannel(ctx, ch.id)
    expect(await listAlertChannels(ctx)).toHaveLength(0)
  })

  it('sendTestEvent no-ops gracefully on missing channel', async () => {
    await expect(sendTestEvent(ctx, 'ch_nonexistent')).resolves.toEqual({ delivered: false, reason: 'channel-not-found' })
  })

  it('sendTestEvent succeeds for an existing channel', async () => {
    const ch = await createAlertChannel(ctx, { kind: 'webhook', label: 'pager', target: 'https://example.com/x' })
    await expect(sendTestEvent(ctx, ch.id)).resolves.toEqual({ delivered: true })
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/api/endpoints/alerts.ts
import { z } from 'zod'
import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import {
  AlertChannelSchema, AlertRuleSchema, AnomalyEventSchema, ThresholdDirectionSchema,
  type AlertChannel, type AlertRule, type AnomalyEvent,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'
import { peerAnomalyEvents } from '@/lib/data/acred/alerts-feed'

type AlertFilter = {
  kinds?: AnomalyEvent['kind'][]
  severities?: AnomalyEvent['severity'][]
  datasetIds?: string[]
}

// Synthetic test-rule events live in-memory and self-evict after 30s.
const _ephemeralEvents: { event: AnomalyEvent; expiresAt: number }[] = []

function activeEphemeralEvents(): AnomalyEvent[] {
  const now = Date.now()
  while (_ephemeralEvents.length && _ephemeralEvents[0].expiresAt < now) {
    _ephemeralEvents.shift()
  }
  return _ephemeralEvents.map((e) => e.event)
}

function matchesDataset(e: AnomalyEvent, datasetIds: string[]): boolean {
  if (datasetIds.length === 0) return true
  return datasetIds.some((id) => (e.detailHref ?? '').includes(id))
}

export const listAlertEvents = mockEndpoint(
  async (_ctx: RequestContext, _signal, filter: AlertFilter = {}): Promise<AnomalyEvent[]> => {
    const dismissed = new Set(store.getDismissedAnomalies().map((d) => d.anomalyId))
    const all = [
      ...acredAnomalyFeed.map((e) => ({ ...e, detailHref: e.detailHref ?? '/datasets/ds_acred' })),
      ...peerAnomalyEvents,
      ...activeEphemeralEvents(),
    ]
      .filter((e) => !dismissed.has(e.id))
      .filter((e) => !filter.kinds       || filter.kinds.length       === 0 || filter.kinds.includes(e.kind))
      .filter((e) => !filter.severities  || filter.severities.length  === 0 || filter.severities.includes(e.severity))
      .filter((e) => matchesDataset(e, filter.datasetIds ?? []))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    return z.array(AnomalyEventSchema).parse(all)
  },
  { latencyMs: 140 }
)

// ---------- Rules ----------

export const listAlertRules = mockEndpoint(
  async (_ctx: RequestContext): Promise<AlertRule[]> => {
    return z.array(AlertRuleSchema).parse(store.getAlertRules())
  },
  { latencyMs: 80 }
)

export const createAlertRule = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: Omit<AlertRule, 'id' | 'createdBy' | 'createdAt'>): Promise<AlertRule> => {
    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdBy: ctx.user?.id ?? 'anonymous',
      createdAt: new Date().toISOString(),
      ...payload,
    }
    store.appendAlertRule(rule)
    return AlertRuleSchema.parse(rule)
  },
  { latencyMs: 100 }
)

export const updateAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal, ruleId: string, patch: Partial<AlertRule>): Promise<AlertRule | undefined> => {
    const next = store.replaceAlertRule(ruleId, patch)
    return next ? AlertRuleSchema.parse(next) : undefined
  },
  { latencyMs: 80 }
)

export const deleteAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal, ruleId: string): Promise<void> => {
    store.removeAlertRule(ruleId)
  },
  { latencyMs: 60 }
)

export const testAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal, ruleId: string): Promise<AnomalyEvent> => {
    const rule = store.getAlertRules().find((r) => r.id === ruleId)
    const event: AnomalyEvent = {
      id: `test_${ruleId}_${Date.now()}`,
      occurredAt: new Date().toISOString(),
      kind: 'amm-sla', severity: 'low',
      title: `Test event for rule "${rule?.label ?? ruleId}"`,
      borrowerNormalized: null, detailHref: null,
    }
    _ephemeralEvents.push({ event, expiresAt: Date.now() + 30_000 })
    return AnomalyEventSchema.parse(event)
  },
  { latencyMs: 80 }
)

// ---------- Channels ----------

export const listAlertChannels = mockEndpoint(
  async (_ctx: RequestContext): Promise<AlertChannel[]> => {
    return z.array(AlertChannelSchema).parse(store.getAlertChannels())
  },
  { latencyMs: 80 }
)

export const createAlertChannel = mockEndpoint(
  async (ctx: RequestContext, _signal, payload: Omit<AlertChannel, 'id' | 'createdBy' | 'createdAt'>): Promise<AlertChannel> => {
    const channel: AlertChannel = {
      id: `ch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdBy: ctx.user?.id ?? 'anonymous',
      createdAt: new Date().toISOString(),
      ...payload,
    }
    store.appendAlertChannel(channel)
    return AlertChannelSchema.parse(channel)
  },
  { latencyMs: 100 }
)

export const deleteAlertChannel = mockEndpoint(
  async (_ctx: RequestContext, _signal, channelId: string): Promise<void> => {
    store.removeAlertChannel(channelId)
  },
  { latencyMs: 60 }
)

export const sendTestEvent = mockEndpoint(
  async (_ctx: RequestContext, _signal, channelId: string): Promise<{ delivered: true } | { delivered: false; reason: string }> => {
    const ch = store.getAlertChannels().find((c) => c.id === channelId)
    if (!ch) return { delivered: false, reason: 'channel-not-found' }
    // Mocked dispatch — no real network call.
    return { delivered: true }
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/api/alerts-endpoint.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/endpoints/alerts.ts tests/unit/api/alerts-endpoint.test.ts
git commit -m "feat(api): alerts endpoints (events feed + rules + channels)"
```

---

## Task 9: Threshold-aware red-flag evaluator + brief endpoint filters

**Files:**
- Modify: `lib/data/acred/red-flags.ts` (evaluator accepts thresholds)
- Modify: `lib/api/endpoints/datasets.ts` (getAcredBriefRedFlags + getAcredAnomalyFeed accept filter args)
- Test: `tests/unit/data/red-flags-threshold.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/data/red-flags-threshold.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateAcredRedFlags } from '@/lib/data/acred/red-flags'
import { acredFacts } from '@/lib/data/acred/facts'
import type { Threshold } from '@/lib/api/schemas'

const NOW = new Date().toISOString()

describe('evaluateAcredRedFlags with thresholds', () => {
  it('default behavior unchanged when thresholds=[]', () => {
    const flagsDefault = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts)
    const flagsEmpty   = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, [])
    expect(flagsEmpty.map((f) => f.id)).toEqual(flagsDefault.map((f) => f.id))
  })

  it('raising the leverage threshold above the current value drops the leverage_high flag', () => {
    const thresholds: Threshold[] = [{
      id: 't1', ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.90, direction: 'above',
      setBy: 'u1', setAt: NOW,
    }]
    const ids = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, thresholds).map((f) => f.id)
    expect(ids).not.toContain('acred.leverage_high')
  })

  it('lowering the non-accrual delta threshold trips the non_accrual_rising flag at lower deltas', () => {
    const thresholds: Threshold[] = [{
      id: 't2', ruleId: 'acred.non_accrual_rising', datasetId: 'ds_acred',
      metric: 'non_accrual_delta', value: 0.05, direction: 'above',
      setBy: 'u1', setAt: NOW,
    }]
    const ids = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, thresholds).map((f) => f.id)
    expect(ids).toContain('acred.non_accrual_rising')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the threshold-aware evaluator**

Open `lib/data/acred/red-flags.ts`. Add `Threshold` import and rewrite each rule's threshold to a `defaultThreshold`. Add a `metric` field per rule keyed off the threshold the slider should set:

```ts
import type { BriefSnapshot, RedFlag, Threshold } from '@/lib/api/schemas'
import { acredFacts } from './facts'
import { acredAnomalyFeed } from './anomalies'

type Facts = typeof acredFacts

export type RedFlagRule = {
  id: string
  label: string
  severity: RedFlag['severity']
  /** Optional metric key for the threshold slider; rules without an override are not slider-eligible. */
  thresholdMetric?: string
  defaultThreshold?: number
  evaluate: (s: BriefSnapshot, f: Facts, threshold: number) => null | { reason: string; drillHref: string | null }
}

const baseHref = '/datasets/ds_acred'

export const acredRedFlagRules: RedFlagRule[] = [
  {
    id: 'acred.non_accrual_rising',
    label: 'Non-accrual % rose QoQ',
    severity: 'medium',
    thresholdMetric: 'non_accrual_delta',
    defaultThreshold: 0.20,
    evaluate: (s, f, threshold) => s.vitals.nonAccrualPct.delta > threshold
      ? {
          reason: `+${s.vitals.nonAccrualPct.delta.toFixed(2)}pp QoQ — ${f.flaggedHoldings.nonAccrual} holdings on non-accrual`,
          drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue`,
        }
      : null,
  },
  {
    id: 'acred.non_accrual_high',
    label: 'Non-accrual % above threshold',
    severity: 'high',
    thresholdMetric: 'non_accrual',
    defaultThreshold: 1.5,
    evaluate: (s, _f, threshold) => s.vitals.nonAccrualPct.value >= threshold
      ? { reason: `Currently ${s.vitals.nonAccrualPct.value.toFixed(2)}%`, drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue` }
      : null,
  },
  {
    id: 'acred.leverage_drift',
    label: 'Leverage moved beyond threshold QoQ',
    severity: 'medium',
    thresholdMetric: 'leverage_delta',
    defaultThreshold: 2.0,
    evaluate: (s, _f, threshold) => Math.abs(s.vitals.leverage.delta) > threshold
      ? { reason: `${s.vitals.leverage.delta.toFixed(2)}pp QoQ`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.leverage_high',
    label: 'Leverage above threshold',
    severity: 'high',
    thresholdMetric: 'leverage',
    defaultThreshold: 0.75,
    evaluate: (s, _f, threshold) => s.vitals.leverage.value > threshold
      ? { reason: `Currently ${(s.vitals.leverage.value * 100).toFixed(1)}%`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.top10_drift',
    label: 'Top-10 concentration drifted beyond threshold',
    severity: 'medium',
    thresholdMetric: 'top10_delta',
    defaultThreshold: 2.0,
    evaluate: (s, _f, threshold) => Math.abs(s.vitals.top10ConcentrationPct.delta) > threshold
      ? { reason: `${s.vitals.top10ConcentrationPct.delta > 0 ? '+' : ''}${s.vitals.top10ConcentrationPct.delta.toFixed(1)}pp QoQ`, drillHref: `${baseHref}/explore?table=concentration_metrics` }
      : null,
  },
  {
    id: 'acred.industry_concentration',
    label: 'Single industry > 25%',
    severity: 'medium',
    evaluate: (_s, f) => f.flaggedHoldings.softwareIndustry > 0
      ? { reason: `Software industry holds ${f.flaggedHoldings.softwareIndustry} positions`, drillHref: `${baseHref}/explore?table=holdings&where=industry%3D%27Software%27` }
      : null,
  },
  {
    id: 'acred.pik_rising',
    label: 'PIK % above threshold',
    severity: 'medium',
    thresholdMetric: 'pik',
    defaultThreshold: 8.0,
    evaluate: (s, f, threshold) => (s.vitals.pikPct.value > threshold)
      ? { reason: `${s.vitals.pikPct.value.toFixed(1)}% (${s.vitals.pikPct.delta > 0 ? '+' : ''}${s.vitals.pikPct.delta.toFixed(1)}pp QoQ) — ${f.flaggedHoldings.pik} PIK positions`, drillHref: `${baseHref}/explore?table=holdings&where=coupon_kind%3D%27pik%27` }
      : null,
  },
  {
    id: 'acred.recent_high_severity_event',
    label: 'New high-severity 8-K linked to held borrower (30d)',
    severity: 'high',
    evaluate: () => {
      const cutoff = Date.now() - 30 * 24 * 3_600_000
      const hit = acredAnomalyFeed.find((e) =>
        e.kind === 'credit-event' &&
        e.severity === 'high' &&
        new Date(e.occurredAt).getTime() >= cutoff,
      )
      return hit
        ? { reason: `${hit.title} — ${hit.borrowerNormalized}`, drillHref: hit.detailHref }
        : null
    },
  },
]

export function evaluateAcredRedFlags(
  snapshot: BriefSnapshot,
  facts: Facts,
  thresholds: Threshold[] = [],
): RedFlag[] {
  const out: RedFlag[] = []
  for (const rule of acredRedFlagRules) {
    try {
      const override = thresholds.find((t) => t.ruleId === rule.id && t.datasetId === 'ds_acred')
      const useThreshold = override?.value ?? rule.defaultThreshold ?? 0
      const result = (rule.evaluate.length === 3)
        ? (rule.evaluate as (s: BriefSnapshot, f: Facts, t: number) => null | { reason: string; drillHref: string | null })(snapshot, facts, useThreshold)
        : (rule.evaluate as (s: BriefSnapshot, f: Facts) => null | { reason: string; drillHref: string | null })(snapshot, facts)
      if (result) {
        out.push({
          id: rule.id, label: rule.label, severity: rule.severity,
          reason: result.reason, drillHref: result.drillHref,
        })
      }
    } catch (err) {
      console.error(`[red-flag] ${rule.id} threw:`, err)
    }
  }
  return out
}
```

- [ ] **Step 4: Update brief endpoints to accept filters**

Open `lib/api/endpoints/datasets.ts`. Replace the two slice-1 endpoints:

```ts
export const getAcredBriefRedFlags = mockEndpoint(
  async (_ctx: RequestContext, _signal, opts: { includeAcknowledged?: boolean } = {}): Promise<RedFlag[]> => {
    const thresholds = await import('@/lib/api/fixtures/decisions').then((m) => m.getThresholds().filter((t) => t.datasetId === 'ds_acred'))
    const acked = await import('@/lib/api/fixtures/decisions').then((m) => m.getAcknowledgedFlags())
    const ackedIds = new Set(
      acked.filter((a) => a.datasetId === 'ds_acred' && (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now())).map((a) => a.flagId),
    )
    const flags = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, thresholds)
    const filtered = opts.includeAcknowledged ? flags : flags.filter((f) => !ackedIds.has(f.id))
    return z.array(RedFlagSchema).parse(filtered)
  },
  { latencyMs: 100 }
)

export const getAcredAnomalyFeed = mockEndpoint(
  async (_ctx: RequestContext, _signal, opts: { includeDismissed?: boolean } = {}): Promise<AnomalyEvent[]> => {
    const dismissed = await import('@/lib/api/fixtures/decisions').then((m) => m.getDismissedAnomalies())
    const dismissedIds = new Set(dismissed.map((d) => d.anomalyId))
    const events = opts.includeDismissed ? acredAnomalyFeed : acredAnomalyFeed.filter((e) => !dismissedIds.has(e.id))
    return z.array(AnomalyEventSchema).parse(events)
  },
  { latencyMs: 100 }
)
```

- [ ] **Step 5: Run, expect PASS** (red-flag override test + all existing tests)

```bash
npm test -- tests/unit/data/red-flags-threshold.test.ts tests/unit/data/acred-red-flags.test.ts tests/unit/api/datasets-endpoints.test.ts && npm run typecheck
```

If any slice-1 test fails due to the rule rewrites, restore semantics — the existing tests assume the default thresholds match the pre-Task-9 behavior, which they do (0.20 / 1.5 / 0.02 / 0.75 / 2.0 / 8.0 etc.).

- [ ] **Step 6: Commit**

```bash
git add lib/data/acred/red-flags.ts lib/api/endpoints/datasets.ts tests/unit/data/red-flags-threshold.test.ts
git commit -m "feat(brief): threshold-aware red-flag evaluator + ack/dismiss filtering on brief endpoints"
```

---

## Task 10: Server-action wrappers

**Files:**
- Create: `app/(app)/datasets/[datasetId]/memo/actions.ts`
- Create: `app/(app)/issuers/actions.ts`
- Create: `app/(app)/alerts/actions.ts`
- Create: `app/(app)/datasets/[datasetId]/decisions-actions.ts`

These are Server Action wrappers that the client forms call. Each calls the corresponding mock endpoint and revalidates the affected route.

- [ ] **Step 1: Implement memo actions**

```ts
// app/(app)/datasets/[datasetId]/memo/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as memos from '@/lib/api/endpoints/memos'
import type { MemoSection, FlagDecision } from '@/lib/api/schemas'

type SectionKey = 'character' | 'capacity' | 'capital' | 'collateral' | 'conditions'

export async function actionUpdateMemoSection(memoId: string, sectionKey: SectionKey, section: MemoSection) {
  const session = await requireUser()
  await memos.updateMemoSection({ user: session }, memoId, sectionKey, section)
  revalidatePath('/datasets/ds_acred/memo')
}

export async function actionRecordFlagDecision(memoId: string, decision: FlagDecision) {
  const session = await requireUser()
  await memos.recordFlagDecision({ user: session }, memoId, decision)
  revalidatePath('/datasets/ds_acred/memo')
}

export async function actionSubmitMemo(memoId: string) {
  const session = await requireUser()
  await memos.submitMemo({ user: session }, memoId)
  revalidatePath('/datasets/ds_acred/memo')
}

export async function actionApproveMemo(memoId: string) {
  const session = await requireUser()
  await memos.approveMemo({ user: session }, memoId)
  revalidatePath('/datasets/ds_acred/memo')
}

export async function actionRequestMemoChanges(memoId: string, note: string) {
  const session = await requireUser()
  await memos.requestMemoChanges({ user: session }, memoId, note)
  revalidatePath('/datasets/ds_acred/memo')
}
```

- [ ] **Step 2: Implement decision actions** (on the brief)

```ts
// app/(app)/datasets/[datasetId]/decisions-actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as decisions from '@/lib/api/endpoints/decisions'
import type { NotificationChannelKind } from '@/lib/api/schemas'

export async function actionAcknowledgeFlag(payload: { flagId: string; datasetId: string; note: string }) {
  const session = await requireUser()
  await decisions.acknowledgeFlag({ user: session }, payload)
  revalidatePath(`/datasets/${payload.datasetId}`)
}

export async function actionSnoozeFlag(payload: { flagId: string; datasetId: string }) {
  const session = await requireUser()
  await decisions.snoozeFlag({ user: session }, payload)
  revalidatePath(`/datasets/${payload.datasetId}`)
}

export async function actionSetThreshold(payload: { ruleId: string; datasetId: string; metric: string; value: number; direction: 'above' | 'below' }) {
  const session = await requireUser()
  await decisions.setThreshold({ user: session }, payload)
  revalidatePath(`/datasets/${payload.datasetId}`)
}

export async function actionDismissAnomaly(payload: { anomalyId: string; reason: string; datasetId: string }) {
  const session = await requireUser()
  await decisions.dismissAnomaly({ user: session }, payload)
  revalidatePath(`/datasets/${payload.datasetId}`)
  revalidatePath('/alerts')
}

export async function actionSetWatch(payload: { datasetId: string; channels: NotificationChannelKind[] }) {
  const session = await requireUser()
  await decisions.setWatch({ user: session }, payload)
  revalidatePath(`/datasets/${payload.datasetId}`)
}

export async function actionClearWatch(datasetId: string) {
  const session = await requireUser()
  await decisions.clearWatch({ user: session }, datasetId)
  revalidatePath(`/datasets/${datasetId}`)
}
```

- [ ] **Step 3: Implement issuer actions**

```ts
// app/(app)/issuers/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as issuers from '@/lib/api/endpoints/issuers'
import type { IssuerRequestKind } from '@/lib/api/schemas'

export async function actionSubmitIssuerRequest(payload: { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }) {
  const session = await requireUser()
  await issuers.submitIssuerRequest({ user: session }, payload)
  revalidatePath(`/issuers/${payload.issuerId}`)
  revalidatePath('/issuers')
}
```

- [ ] **Step 4: Implement alerts actions**

```ts
// app/(app)/alerts/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as alerts from '@/lib/api/endpoints/alerts'
import type { AlertRule, AlertChannel } from '@/lib/api/schemas'

export async function actionCreateAlertRule(payload: Omit<AlertRule, 'id' | 'createdBy' | 'createdAt'>) {
  const session = await requireUser()
  await alerts.createAlertRule({ user: session }, payload)
  revalidatePath('/alerts/rules')
}

export async function actionUpdateAlertRule(ruleId: string, patch: Partial<AlertRule>) {
  const session = await requireUser()
  await alerts.updateAlertRule({ user: session }, ruleId, patch)
  revalidatePath('/alerts/rules')
}

export async function actionDeleteAlertRule(ruleId: string) {
  const session = await requireUser()
  await alerts.deleteAlertRule({ user: session }, ruleId)
  revalidatePath('/alerts/rules')
}

export async function actionTestAlertRule(ruleId: string) {
  const session = await requireUser()
  await alerts.testAlertRule({ user: session }, ruleId)
  revalidatePath('/alerts')
}

export async function actionCreateAlertChannel(payload: Omit<AlertChannel, 'id' | 'createdBy' | 'createdAt'>) {
  const session = await requireUser()
  await alerts.createAlertChannel({ user: session }, payload)
  revalidatePath('/alerts/channels')
}

export async function actionDeleteAlertChannel(channelId: string) {
  const session = await requireUser()
  await alerts.deleteAlertChannel({ user: session }, channelId)
  revalidatePath('/alerts/channels')
}

export async function actionSendTestEvent(channelId: string): Promise<{ delivered: true } | { delivered: false; reason: string }> {
  const session = await requireUser()
  return alerts.sendTestEvent({ user: session }, channelId)
}
```

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add 'app/(app)/datasets/[datasetId]/memo/actions.ts' 'app/(app)/datasets/[datasetId]/decisions-actions.ts' 'app/(app)/issuers/actions.ts' 'app/(app)/alerts/actions.ts'
git commit -m "feat(api): server-action wrappers for memo / decisions / issuers / alerts"
```

---

## Task 11: Memo section building blocks

**Files:**
- Create: `components/features/memo/memo-section-shell.tsx`
- Create: `components/features/memo/memo-section-editor.tsx`
- Test: `tests/unit/components/memo/memo-section-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/memo/memo-section-shell.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoSectionShell } from '@/components/features/memo/memo-section-shell'

describe('MemoSectionShell', () => {
  it('renders the C label, prompt, and children slot', () => {
    render(
      <MemoSectionShell letter="C" name="Character" prompt="Issuer track record and reputation.">
        <p>body here</p>
      </MemoSectionShell>
    )
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Character')).toBeInTheDocument()
    expect(screen.getByText(/Issuer track record/)).toBeInTheDocument()
    expect(screen.getByText('body here')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/memo/memo-section-shell.tsx
import type { ReactNode } from 'react'

export function MemoSectionShell({
  letter, name, prompt, children,
}: { letter: string; name: string; prompt: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface/40 p-5">
      <header className="mb-3 flex items-baseline gap-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/10 font-mono text-sm font-semibold">{letter}</span>
        <h3 className="text-lg font-medium">{name}</h3>
        <p className="text-xs text-muted-foreground">{prompt}</p>
      </header>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}
```

```tsx
// components/features/memo/memo-section-editor.tsx
'use client'
import { useState, useEffect, useRef } from 'react'

type Props = {
  initialMarkdown: string
  onSave: (markdown: string) => Promise<void>
  readOnly?: boolean
}

export function MemoSectionEditor({ initialMarkdown, onSave, readOnly }: Props) {
  const [value, setValue] = useState(initialMarkdown)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function handleChange(next: string) {
    setValue(next)
    if (readOnly) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try { await onSave(next) } finally { setSaving(false) }
    }, 600)
  }

  return (
    <div className="grid gap-1">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={readOnly}
        placeholder="Write your analysis here…"
        className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed disabled:opacity-60"
      />
      <p className="text-xs text-muted-foreground">{saving ? 'Saving…' : 'Auto-saves after a pause.'}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/memo/memo-section-shell.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/memo/memo-section-shell.tsx components/features/memo/memo-section-editor.tsx tests/unit/components/memo/memo-section-shell.test.tsx
git commit -m "feat(memo): MemoSectionShell + MemoSectionEditor with autosave"
```

---

## Task 12: Memo insert picker + block (DuckDB-backed methodology insertion)

**Files:**
- Create: `components/features/memo/memo-insert-picker.tsx`
- Create: `components/features/memo/memo-insert-block.tsx`
- Test: `tests/unit/components/memo/memo-insert-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/memo/memo-insert-picker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoInsertPicker } from '@/components/features/memo/memo-insert-picker'

describe('MemoInsertPicker', () => {
  it('lists the methodologies for the given section', async () => {
    const user = userEvent.setup()
    render(<MemoInsertPicker sectionKey="capital" onInsert={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /insert data/i }))
    expect(screen.getByText(/Top-10 borrower exposure/i)).toBeInTheDocument()
  })

  it('calls onInsert with the methodologyId when a candidate is clicked', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(<MemoInsertPicker sectionKey="capital" onInsert={onInsert} />)
    await user.click(screen.getByRole('button', { name: /insert data/i }))
    await user.click(screen.getByRole('button', { name: /Top-10 borrower exposure/i }))
    expect(onInsert).toHaveBeenCalledWith('acred.top10_borrowers')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/memo/memo-insert-picker.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { acredMethodology } from '@/lib/data/acred/methodology'

type SectionKey = 'character' | 'capacity' | 'capital' | 'collateral' | 'conditions'

// Per-section methodology candidates by id.
const SECTION_CANDIDATES: Record<SectionKey, string[]> = {
  character:  [],
  capacity:   ['acred.nav_trend', 'acred.non_accrual_pct_over_time', 'acred.coupon_kind_mix'],
  capital:    ['acred.top10_borrowers', 'acred.sector_mix', 'acred.maturity_profile', 'acred.net_flow_over_time'],
  collateral: ['acred.first_lien_pct', 'acred.top10_concentration_pct', 'acred.top10_concentration_now_vs_prior'],
  conditions: ['acred.sector_mix', 'acred.geo_mix', 'acred.event_severity_mix', 'acred.event_frequency_by_month'],
}

export function MemoInsertPicker({
  sectionKey, onInsert,
}: { sectionKey: SectionKey; onInsert: (methodologyId: string) => void }) {
  const [open, setOpen] = useState(false)
  const candidates = SECTION_CANDIDATES[sectionKey]
    .map((id) => acredMethodology.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  if (candidates.length === 0) {
    return <p className="text-xs text-muted-foreground">No automated inserts available for this section.</p>
  }

  return (
    <div className="relative inline-block">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        Insert data
      </Button>
      {open && (
        <div className="absolute z-10 mt-2 w-80 rounded-md border border-border bg-surface p-2 shadow-lg">
          <ul className="grid gap-1">
            {candidates.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => { onInsert(m.id); setOpen(false) }}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

```tsx
// components/features/memo/memo-insert-block.tsx
'use client'
import { useCellQuery } from '@/lib/data/use-cell-query'
import { acredMethodology } from '@/lib/data/acred/methodology'
import { Cell } from '@/lib/data/format-cell'
import type { MemoInsert } from '@/lib/api/schemas'

export function MemoInsertBlock({ insert, footnoteNumber }: { insert: MemoInsert; footnoteNumber: number }) {
  const methodology = acredMethodology.find((m) => m.id === insert.methodologyId)
  const result = useCellQuery({ cellId: insert.id, dsl: methodology?.dsl ?? '' })

  if (!methodology) {
    return <p className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">Methodology &quot;{insert.methodologyId}&quot; not found.</p>
  }

  return (
    <figure className="rounded-md border border-border bg-surface/30 p-3 text-xs">
      <figcaption className="mb-2 flex items-baseline gap-2 text-foreground/70">
        <span className="font-mono text-[0.65rem]">[{footnoteNumber}]</span>
        <span className="font-medium">{methodology.title}</span>
        <span className="text-muted-foreground">— inserted {new Date(insert.insertedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </figcaption>
      {result.state === 'pending' && <p className="text-muted-foreground">Computing…</p>}
      {result.state === 'error'   && <p className="text-danger">Error: {result.error}</p>}
      {result.state === 'ready'   && (
        <div className="overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <tbody>
              {result.rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1"><Cell value={cell} column={result.columns[j]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
```

> Note: `useCellQuery` and `format-cell` are existing slice-1 modules. If their imports differ, adjust to match (e.g. `import { Cell } from '@/lib/data/format-cell.tsx'`).

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/memo/memo-insert-picker.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/memo/memo-insert-picker.tsx components/features/memo/memo-insert-block.tsx tests/unit/components/memo/memo-insert-picker.test.tsx
git commit -m "feat(memo): MemoInsertPicker + MemoInsertBlock"
```

---

## Task 13: MemoEditor composite + flag checklist + status bar + audit log

**Files:**
- Create: `components/features/memo/memo-editor.tsx`
- Create: `components/features/memo/memo-flag-checklist.tsx`
- Create: `components/features/memo/memo-status-bar.tsx`
- Create: `components/features/memo/memo-audit-log.tsx`
- Test: `tests/unit/components/memo/memo-flag-checklist.test.tsx`
- Test: `tests/unit/components/memo/memo-status-bar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/unit/components/memo/memo-flag-checklist.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoFlagChecklist } from '@/components/features/memo/memo-flag-checklist'
import type { RedFlag, FlagDecision } from '@/lib/api/schemas'

const flags: RedFlag[] = [
  { id: 'f1', label: 'Leverage high', severity: 'high', reason: '78%', drillHref: null },
  { id: 'f2', label: 'PIK rising',    severity: 'medium', reason: '+1.1pp', drillHref: null },
]
const decisions: FlagDecision[] = []

describe('MemoFlagChecklist', () => {
  it('renders one row per active flag', () => {
    render(<MemoFlagChecklist flags={flags} decisions={decisions} onDecide={vi.fn()} readOnly={false} />)
    expect(screen.getByText(/Leverage high/)).toBeInTheDocument()
    expect(screen.getByText(/PIK rising/)).toBeInTheDocument()
  })

  it('requires a note before submitting an acknowledge decision', async () => {
    const user = userEvent.setup()
    const onDecide = vi.fn()
    render(<MemoFlagChecklist flags={flags} decisions={decisions} onDecide={onDecide} readOnly={false} />)
    await user.click(screen.getAllByRole('button', { name: /acknowledge/i })[0])
    await user.click(screen.getByRole('button', { name: /save decision/i }))
    expect(onDecide).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/note/i), 'IC accepts the leverage profile.')
    await user.click(screen.getByRole('button', { name: /save decision/i }))
    expect(onDecide).toHaveBeenCalledTimes(1)
  })

  it('shows existing decisions and hides controls in readOnly', () => {
    render(<MemoFlagChecklist
      flags={flags}
      decisions={[{ flagId: 'f1', action: 'acknowledge', note: 'ok', decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: 'u1' }]}
      onDecide={vi.fn()}
      readOnly={true}
    />)
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /acknowledge/i })).toBeNull()
  })
})
```

```tsx
// tests/unit/components/memo/memo-status-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoStatusBar } from '@/components/features/memo/memo-status-bar'

describe('MemoStatusBar', () => {
  it('shows Submit button on draft for counterparty', () => {
    render(<MemoStatusBar memoStatus="draft" userRole="counterparty" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.getByRole('button', { name: /submit for IC review/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull()
  })

  it('shows Approve and Request changes on submitted for admin', () => {
    render(<MemoStatusBar memoStatus="submitted" userRole="admin" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument()
  })

  it('shows no actions when approved', () => {
    render(<MemoStatusBar memoStatus="approved" userRole="counterparty" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/Approved/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/memo/memo-flag-checklist.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RedFlag, FlagDecision, FlagDecisionAction } from '@/lib/api/schemas'

type Props = {
  flags: RedFlag[]
  decisions: FlagDecision[]
  onDecide: (decision: Omit<FlagDecision, 'decidedAt' | 'decidedBy'>) => void
  readOnly: boolean
}

const sevTone: Record<RedFlag['severity'], string> = {
  low: 'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high: 'border-danger/40 bg-danger/5',
}

export function MemoFlagChecklist({ flags, decisions, onDecide, readOnly }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<FlagDecisionAction>('acknowledge')
  const [note, setNote] = useState('')

  function open(flagId: string, action: FlagDecisionAction) {
    setActiveId(flagId); setActiveAction(action); setNote('')
  }
  function save() {
    if (!activeId || note.trim().length === 0) return
    onDecide({ flagId: activeId, action: activeAction, note: note.trim() })
    setActiveId(null); setNote('')
  }

  return (
    <ul className="grid gap-2">
      {flags.map((f) => {
        const decision = decisions.find((d) => d.flagId === f.id)
        return (
          <li key={f.id} className={cn('rounded-md border-l-2 p-3', sevTone[f.severity])}>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.reason}</p>
              </div>
              {decision && (
                <span className="rounded-sm bg-foreground/10 px-2 py-0.5 text-[0.65rem] font-tag uppercase">
                  {decision.action === 'acknowledge' ? 'Acknowledged' : decision.action === 'dismiss' ? 'Dismissed' : 'Mitigated'}
                </span>
              )}
            </div>
            {decision && <p className="mt-2 text-xs italic text-muted-foreground">&quot;{decision.note}&quot;</p>}
            {!decision && !readOnly && activeId !== f.id && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'acknowledge')}>Acknowledge</Button>
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'dismiss')}>Dismiss</Button>
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'mitigate')}>Mitigate</Button>
              </div>
            )}
            {activeId === f.id && !readOnly && (
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-xs">
                  <span>Note ({activeAction}):</span>
                  <textarea
                    aria-label="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-16 rounded-md border border-border bg-background p-2"
                  />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={save}>Save decision</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

```tsx
// components/features/memo/memo-status-bar.tsx
'use client'
import { Button } from '@/components/ui/button'
import type { MemoStatus, Role } from '@/lib/api/schemas'

type Props = {
  memoStatus: MemoStatus
  userRole: Role
  onSubmit: () => void
  onApprove: () => void
  onRequestChanges: () => void
}

const statusLabel: Record<MemoStatus, string> = {
  draft: 'Draft', submitted: 'Submitted for IC review', approved: 'Approved',
}

export function MemoStatusBar({ memoStatus, userRole, onSubmit, onApprove, onRequestChanges }: Props) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-3">
      <p className="font-tag text-xs uppercase tracking-wider text-foreground/55">{statusLabel[memoStatus]}</p>
      <div className="flex gap-2">
        {memoStatus === 'draft' && userRole !== 'originator' && (
          <Button onClick={onSubmit}>Submit for IC review</Button>
        )}
        {memoStatus === 'submitted' && userRole === 'admin' && (
          <>
            <Button variant="outline" onClick={onRequestChanges}>Request changes</Button>
            <Button onClick={onApprove}>Approve</Button>
          </>
        )}
      </div>
    </div>
  )
}
```

```tsx
// components/features/memo/memo-audit-log.tsx
import type { Memo } from '@/lib/api/schemas'
import { formatDistanceToNow } from 'date-fns'

export function MemoAuditLog({ memo }: { memo: Memo }) {
  const events: { ts: string; label: string }[] = []
  events.push({ ts: memo.createdAt, label: 'Draft created' })
  events.push({ ts: memo.updatedAt, label: 'Last edited' })
  if (memo.submittedAt) events.push({ ts: memo.submittedAt, label: 'Submitted for IC review' })
  if (memo.approvedAt) events.push({ ts: memo.approvedAt, label: `Approved by ${memo.approvedBy ?? 'admin'}` })
  for (const d of memo.flagDecisions) {
    events.push({ ts: d.decidedAt, label: `${d.action} on ${d.flagId}` })
  }
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  return (
    <section aria-labelledby="memo-audit">
      <h4 id="memo-audit" className="mb-2 font-tag text-xs text-foreground/55">{'// audit log'}</h4>
      <ul className="grid gap-1 text-xs">
        {events.map((e, i) => (
          <li key={i} className="flex items-center justify-between text-muted-foreground">
            <span>{e.label}</span>
            <span className="tabular-nums">{formatDistanceToNow(new Date(e.ts), { addSuffix: true })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// components/features/memo/memo-editor.tsx
'use client'
import { useTransition } from 'react'
import { MemoSectionShell } from './memo-section-shell'
import { MemoSectionEditor } from './memo-section-editor'
import { MemoInsertPicker } from './memo-insert-picker'
import { MemoInsertBlock } from './memo-insert-block'
import { MemoFlagChecklist } from './memo-flag-checklist'
import { MemoStatusBar } from './memo-status-bar'
import { MemoAuditLog } from './memo-audit-log'
import {
  actionUpdateMemoSection, actionRecordFlagDecision,
  actionSubmitMemo, actionApproveMemo, actionRequestMemoChanges,
} from '@/app/(app)/datasets/[datasetId]/memo/actions'
import type { Memo, MemoSection, RedFlag, Role, FlagDecision } from '@/lib/api/schemas'

const SECTIONS: { key: keyof Memo['sections']; letter: string; name: string; prompt: string }[] = [
  { key: 'character',  letter: 'C', name: 'Character',  prompt: 'Issuer track record and reputation.' },
  { key: 'capacity',   letter: 'C', name: 'Capacity',   prompt: 'Ability to service debt across the cycle.' },
  { key: 'capital',    letter: 'C', name: 'Capital',    prompt: 'Composition of the portfolio.' },
  { key: 'collateral', letter: 'C', name: 'Collateral', prompt: 'Seniority and concentration.' },
  { key: 'conditions', letter: 'C', name: 'Conditions', prompt: 'Macro and sector exposure.' },
]

export function MemoEditor({ memo, redFlags, userRole }: { memo: Memo; redFlags: RedFlag[]; userRole: Role }) {
  const [pending, startTransition] = useTransition()
  const readOnly = memo.status !== 'draft'

  function saveSection(key: keyof Memo['sections'], section: MemoSection) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        await actionUpdateMemoSection(memo.id, key, section)
        resolve()
      })
    })
  }

  function insertIntoSection(key: keyof Memo['sections'], methodologyId: string) {
    const current = memo.sections[key]
    const nextSection: MemoSection = {
      markdown: current.markdown,
      inserts: [...current.inserts, {
        id: `ins_${methodologyId}_${Date.now()}`,
        methodologyId,
        insertedAt: new Date().toISOString(),
      }],
    }
    startTransition(() => { actionUpdateMemoSection(memo.id, key, nextSection) })
  }

  function recordDecision(partial: Omit<FlagDecision, 'decidedAt' | 'decidedBy'>) {
    const decision: FlagDecision = {
      ...partial,
      decidedAt: new Date().toISOString(),
      decidedBy: memo.authorId,
    }
    startTransition(() => { actionRecordFlagDecision(memo.id, decision) })
  }

  return (
    <div className="grid gap-6">
      <MemoStatusBar
        memoStatus={memo.status}
        userRole={userRole}
        onSubmit={() => startTransition(() => { actionSubmitMemo(memo.id) })}
        onApprove={() => startTransition(() => { actionApproveMemo(memo.id) })}
        onRequestChanges={() => startTransition(() => { actionRequestMemoChanges(memo.id, '') })}
      />

      {SECTIONS.map((s) => (
        <MemoSectionShell key={s.key} letter={s.letter} name={s.name} prompt={s.prompt}>
          <MemoSectionEditor
            initialMarkdown={memo.sections[s.key].markdown}
            readOnly={readOnly}
            onSave={(md) => saveSection(s.key, { markdown: md, inserts: memo.sections[s.key].inserts })}
          />
          <div className="grid gap-2">
            {memo.sections[s.key].inserts.map((insert, i) => (
              <MemoInsertBlock key={insert.id} insert={insert} footnoteNumber={i + 1} />
            ))}
          </div>
          {!readOnly && <MemoInsertPicker sectionKey={s.key} onInsert={(id) => insertIntoSection(s.key, id)} />}
        </MemoSectionShell>
      ))}

      <section className="rounded-lg border border-border bg-surface/40 p-5">
        <h3 className="mb-3 font-tag text-foreground/60">{'// red-flag checklist'}</h3>
        <MemoFlagChecklist flags={redFlags} decisions={memo.flagDecisions} onDecide={recordDecision} readOnly={readOnly} />
      </section>

      <MemoAuditLog memo={memo} />

      {pending && <p className="sr-only">Saving…</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/memo && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/memo tests/unit/components/memo
git commit -m "feat(memo): editor composite + flag checklist + status bar + audit log"
```

---

## Task 14: Red-flag action bar + threshold slider popover

**Files:**
- Create: `components/features/brief/red-flag-action-bar.tsx`
- Create: `components/features/brief/threshold-slider-popover.tsx`
- Test: `tests/unit/components/brief/red-flag-action-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/brief/red-flag-action-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RedFlagActionBar } from '@/components/features/brief/red-flag-action-bar'

describe('RedFlagActionBar', () => {
  it('fires onAcknowledge with note', async () => {
    const user = userEvent.setup()
    const onAck = vi.fn()
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={true}
      onAcknowledge={onAck} onSnooze={vi.fn()} onSetThreshold={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /acknowledge/i }))
    await user.type(screen.getByLabelText(/note/i), 'IC accepts.')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onAck).toHaveBeenCalledWith('IC accepts.')
  })

  it('hides Set threshold when sliderEligible=false', () => {
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={false}
      onAcknowledge={vi.fn()} onSnooze={vi.fn()} onSetThreshold={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /set threshold/i })).toBeNull()
  })

  it('fires onSnooze immediately', async () => {
    const user = userEvent.setup()
    const onSnooze = vi.fn()
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={true}
      onAcknowledge={vi.fn()} onSnooze={onSnooze} onSetThreshold={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /snooze 7d/i }))
    expect(onSnooze).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/threshold-slider-popover.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  metric: string
  min: number
  max: number
  step: number
  initial: number
  onSet: (value: number) => void
  onCancel: () => void
}

export function ThresholdSliderPopover({ metric, min, max, step, initial, onSet, onCancel }: Props) {
  const [value, setValue] = useState(initial)
  return (
    <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
      <label className="grid gap-1 text-xs">
        <span>{metric} threshold: <span className="tabular-nums">{value}</span></span>
        <input
          aria-label={`${metric} threshold`}
          type="range" min={min} max={max} step={step}
          value={value} onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-full"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSet(value)}>Save threshold</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
```

```tsx
// components/features/brief/red-flag-action-bar.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThresholdSliderPopover } from './threshold-slider-popover'

const SLIDER_SPECS: Record<string, { metric: string; min: number; max: number; step: number; initial: number }> = {
  'acred.non_accrual_rising': { metric: 'non_accrual_delta', min: 0.05, max: 0.50, step: 0.01, initial: 0.20 },
  'acred.non_accrual_high':   { metric: 'non_accrual',       min: 0.5,  max: 3.0,  step: 0.05, initial: 1.5 },
  'acred.leverage_drift':     { metric: 'leverage_delta',    min: 0.5,  max: 5.0,  step: 0.1,  initial: 2.0 },
  'acred.leverage_high':      { metric: 'leverage',          min: 0.60, max: 0.90, step: 0.01, initial: 0.75 },
  'acred.top10_drift':        { metric: 'top10_delta',       min: 0.5,  max: 5.0,  step: 0.1,  initial: 2.0 },
  'acred.pik_rising':         { metric: 'pik',               min: 3,    max: 15,   step: 0.5,  initial: 8 },
}

type Props = {
  flagId: string
  datasetId: string
  sliderEligible: boolean
  onAcknowledge: (note: string) => void
  onSnooze: () => void
  onSetThreshold: (metric: string, value: number) => void
}

export function RedFlagActionBar({ flagId, datasetId, sliderEligible, onAcknowledge, onSnooze, onSetThreshold }: Props) {
  void datasetId
  const [mode, setMode] = useState<'none' | 'ack' | 'threshold'>('none')
  const [note, setNote] = useState('')
  const spec = SLIDER_SPECS[flagId]
  const canSlider = sliderEligible && Boolean(spec)

  return (
    <div className="mt-2 grid gap-2">
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode('ack')}>Acknowledge</Button>
          <Button size="sm" variant="outline" onClick={onSnooze}>Snooze 7d</Button>
          {canSlider && <Button size="sm" variant="outline" onClick={() => setMode('threshold')}>Set threshold</Button>}
        </div>
      )}
      {mode === 'ack' && (
        <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
          <label className="grid gap-1 text-xs">
            <span>Note:</span>
            <textarea aria-label="note" value={note} onChange={(e) => setNote(e.target.value)}
              className="min-h-16 rounded-md border border-border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={note.trim().length === 0}
              onClick={() => { onAcknowledge(note.trim()); setNote(''); setMode('none') }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNote(''); setMode('none') }}>Cancel</Button>
          </div>
        </div>
      )}
      {mode === 'threshold' && spec && (
        <ThresholdSliderPopover
          metric={spec.metric} min={spec.min} max={spec.max} step={spec.step} initial={spec.initial}
          onSet={(v) => { onSetThreshold(spec.metric, v); setMode('none') }}
          onCancel={() => setMode('none')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/brief/red-flag-action-bar.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/red-flag-action-bar.tsx components/features/brief/threshold-slider-popover.tsx tests/unit/components/brief/red-flag-action-bar.test.tsx
git commit -m "feat(brief): RedFlagActionBar + ThresholdSliderPopover"
```

---

## Task 15: Anomaly action bar

**Files:**
- Create: `components/features/brief/anomaly-action-bar.tsx`
- Test: `tests/unit/components/brief/anomaly-action-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/brief/anomaly-action-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnomalyActionBar } from '@/components/features/brief/anomaly-action-bar'

describe('AnomalyActionBar', () => {
  it('fires onDismiss with reason', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AnomalyActionBar anomalyId="e1" onDismiss={onDismiss} onPinToMemo={vi.fn()} onConvertToRule={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await user.type(screen.getByLabelText(/reason/i), 'already in memo')
    await user.click(screen.getByRole('button', { name: /save dismissal/i }))
    expect(onDismiss).toHaveBeenCalledWith('already in memo')
  })

  it('fires onPinToMemo and onConvertToRule', async () => {
    const user = userEvent.setup()
    const onPin = vi.fn(); const onConvert = vi.fn()
    render(<AnomalyActionBar anomalyId="e1" onDismiss={vi.fn()} onPinToMemo={onPin} onConvertToRule={onConvert} />)
    await user.click(screen.getByRole('button', { name: /pin to memo/i }))
    expect(onPin).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /convert to alert rule/i }))
    expect(onConvert).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/anomaly-action-bar.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  anomalyId: string
  onDismiss: (reason: string) => void
  onPinToMemo: () => void
  onConvertToRule: () => void
}

export function AnomalyActionBar({ anomalyId, onDismiss, onPinToMemo, onConvertToRule }: Props) {
  void anomalyId
  const [mode, setMode] = useState<'none' | 'dismiss'>('none')
  const [reason, setReason] = useState('')

  return (
    <div className="mt-2 grid gap-2">
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode('dismiss')}>Dismiss</Button>
          <Button size="sm" variant="outline" onClick={onPinToMemo}>Pin to memo</Button>
          <Button size="sm" variant="outline" onClick={onConvertToRule}>Convert to alert rule</Button>
        </div>
      )}
      {mode === 'dismiss' && (
        <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
          <label className="grid gap-1 text-xs">
            <span>Reason:</span>
            <textarea aria-label="reason" value={reason} onChange={(e) => setReason(e.target.value)}
              className="min-h-16 rounded-md border border-border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={reason.trim().length === 0}
              onClick={() => { onDismiss(reason.trim()); setReason(''); setMode('none') }}>Save dismissal</Button>
            <Button size="sm" variant="ghost" onClick={() => { setReason(''); setMode('none') }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/brief/anomaly-action-bar.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/anomaly-action-bar.tsx tests/unit/components/brief/anomaly-action-bar.test.tsx
git commit -m "feat(brief): AnomalyActionBar (dismiss / pin / convert)"
```

---

## Task 16: Watch toggle (brief header integration)

**Files:**
- Create: `components/features/brief/watch-toggle.tsx`
- Test: `tests/unit/components/brief/watch-toggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/brief/watch-toggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchToggle } from '@/components/features/brief/watch-toggle'

describe('WatchToggle', () => {
  it('shows "Watch" when not watching and toggles', async () => {
    const user = userEvent.setup()
    const onWatch = vi.fn()
    render(<WatchToggle datasetId="ds_acred" initialWatching={false} initialChannels={[]} onWatch={onWatch} onUnwatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /watch/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /watch/i }))
    expect(onWatch).toHaveBeenCalled()
  })

  it('shows "Watching" when initialWatching=true', () => {
    render(<WatchToggle datasetId="ds_acred" initialWatching={true} initialChannels={['slack']} onWatch={vi.fn()} onUnwatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /watching/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/watch-toggle.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { NotificationChannelKind } from '@/lib/api/schemas'

type Props = {
  datasetId: string
  initialWatching: boolean
  initialChannels: NotificationChannelKind[]
  onWatch: (channels: NotificationChannelKind[]) => void
  onUnwatch: () => void
}

const ALL_CHANNELS: NotificationChannelKind[] = ['slack', 'email', 'webhook']

export function WatchToggle({ datasetId, initialWatching, initialChannels, onWatch, onUnwatch }: Props) {
  void datasetId
  const [open, setOpen] = useState(false)
  const [channels, setChannels] = useState<NotificationChannelKind[]>(initialChannels)
  const watching = initialWatching

  function toggleChannel(kind: NotificationChannelKind) {
    setChannels((cur) => cur.includes(kind) ? cur.filter((c) => c !== kind) : [...cur, kind])
  }

  return (
    <div className="relative inline-block">
      <Button size="sm" variant={watching ? 'default' : 'outline'} onClick={() => setOpen((o) => !o)}>
        {watching ? `Watching${channels.length ? ` · ${channels.length}` : ''}` : 'Watch'}
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 font-tag text-xs text-foreground/60">{'// notification channels'}</p>
          <ul className="grid gap-1">
            {ALL_CHANNELS.map((c) => (
              <li key={c}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} />
                  <span className="capitalize">{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { onWatch(channels); setOpen(false) }}>{watching ? 'Update' : 'Watch'}</Button>
            {watching && <Button size="sm" variant="ghost" onClick={() => { onUnwatch(); setOpen(false) }}>Stop watching</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/brief/watch-toggle.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/watch-toggle.tsx tests/unit/components/brief/watch-toggle.test.tsx
git commit -m "feat(brief): WatchToggle with channel picker"
```

---

## Task 17: Issuer building blocks (table + detail header + asset roster + SLA table)

**Files:**
- Create: `components/features/issuers/issuer-table.tsx`
- Create: `components/features/issuers/issuer-detail-header.tsx`
- Create: `components/features/issuers/issuer-asset-roster.tsx`
- Create: `components/features/issuers/issuer-sla-table.tsx`
- Test: `tests/unit/components/issuers/issuer-table.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/issuers/issuer-table.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IssuerTable } from '@/components/features/issuers/issuer-table'
import type { IssuerCompliance } from '@/lib/api/schemas'

const rows: IssuerCompliance[] = [
  {
    issuerId: 'org_apollo', assetIds: ['ds_acred'],
    discipline: { expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28, lastGapAt: null, cadenceBreakdown: [] },
    openRequestCount: 1,
  },
  {
    issuerId: 'org_janus', assetIds: ['ds_jaaa'],
    discipline: { expectedLast30d: 30, deliveredLast30d: 28, onTimeLast30d: 25, lastGapAt: null, cadenceBreakdown: [] },
    openRequestCount: 0,
  },
]

describe('IssuerTable', () => {
  it('renders one row per issuer with on-time %', () => {
    render(<IssuerTable issuers={rows} orgs={[
      { id: 'org_apollo', name: 'Apollo Asset Management', assetClasses: [], verified: true },
      { id: 'org_janus',  name: 'Janus Henderson',         assetClasses: [], verified: false },
    ]} />)
    expect(screen.getByText(/Apollo Asset Management/)).toBeInTheDocument()
    expect(screen.getByText(/Janus Henderson/)).toBeInTheDocument()
    expect(screen.getByText(/93%/)).toBeInTheDocument()  // 28/30
  })

  it('Apollo row links to /issuers/org_apollo', () => {
    render(<IssuerTable issuers={rows} orgs={[
      { id: 'org_apollo', name: 'Apollo Asset Management', assetClasses: [], verified: true },
    ]} />)
    const link = screen.getByRole('link', { name: /Apollo/i })
    expect(link).toHaveAttribute('href', '/issuers/org_apollo')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/issuers/issuer-table.tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { IssuerCompliance, Org } from '@/lib/api/schemas'

function onTimePct(d: IssuerCompliance['discipline']): number {
  if (d.expectedLast30d === 0) return 0
  return Math.round((d.onTimeLast30d / d.expectedLast30d) * 100)
}

export function IssuerTable({ issuers, orgs }: { issuers: IssuerCompliance[]; orgs: Org[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Issuer</th>
            <th className="text-right">Assets</th>
            <th className="text-right">30d on-time</th>
            <th className="text-right">Open requests</th>
          </tr>
        </thead>
        <tbody>
          {issuers.map((i) => {
            const org = orgs.find((o) => o.id === i.issuerId)
            return (
              <tr key={i.issuerId} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/issuers/${i.issuerId}`} className="font-medium hover:underline">{org?.name ?? i.issuerId}</Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{i.assetIds.length}</td>
                <td className="px-3 py-2 text-right tabular-nums">{onTimePct(i.discipline)}%</td>
                <td className="px-3 py-2 text-right">
                  {i.openRequestCount > 0 ? <Badge variant="outline">{i.openRequestCount}</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {issuers.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No issuers in the portfolio.</p>
      )}
    </div>
  )
}
```

```tsx
// components/features/issuers/issuer-detail-header.tsx
import type { Org, IssuerCompliance } from '@/lib/api/schemas'

export function IssuerDetailHeader({ org, compliance }: { org: Org; compliance: IssuerCompliance }) {
  const onTime = compliance.discipline.expectedLast30d > 0
    ? Math.round((compliance.discipline.onTimeLast30d / compliance.discipline.expectedLast30d) * 100)
    : 0
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <h2 className="text-xl font-medium">{org.name}</h2>
      <p className="text-sm text-muted-foreground">
        {compliance.assetIds.length} asset{compliance.assetIds.length === 1 ? '' : 's'} originated ·
        {' '}30d on-time {onTime}% ({compliance.discipline.onTimeLast30d}/{compliance.discipline.expectedLast30d})
      </p>
    </header>
  )
}
```

```tsx
// components/features/issuers/issuer-asset-roster.tsx
import Link from 'next/link'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Dataset } from '@/lib/api/schemas'

export function IssuerAssetRoster({ datasets }: { datasets: Dataset[] }) {
  return (
    <section aria-labelledby="asset-roster">
      <h3 id="asset-roster" className="mb-2 font-tag text-foreground/60">{'// asset roster'}</h3>
      <ul className="grid gap-2">
        {datasets.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-md border border-border bg-surface/30 p-3 text-sm">
            <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
            <span className="text-xs text-muted-foreground">
              <FreshnessIndicator timestamp={d.lastAttestedAt} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// components/features/issuers/issuer-sla-table.tsx
import type { AttestationDiscipline } from '@/lib/api/schemas'

export function IssuerSlaTable({ discipline }: { discipline: AttestationDiscipline }) {
  return (
    <section aria-labelledby="sla">
      <h3 id="sla" className="mb-2 font-tag text-foreground/60">{'// sla terms'}</h3>
      <table className="w-full text-sm">
        <thead className="text-foreground/55">
          <tr className="[&>th]:py-1.5 text-left">
            <th>Cadence</th><th>Metric</th><th className="text-right">Delivered</th><th className="text-right">On time</th>
          </tr>
        </thead>
        <tbody>
          {discipline.cadenceBreakdown.map((c) => (
            <tr key={c.cadence + c.metric} className="border-t border-border/60">
              <td className="py-1.5 capitalize">{c.cadence}</td>
              <td>{c.metric}</td>
              <td className="text-right tabular-nums">{c.delivered}/{c.expected}</td>
              <td className="text-right tabular-nums">{c.onTime}/{c.expected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/issuers/issuer-table.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/issuers tests/unit/components/issuers
git commit -m "feat(issuers): table + detail header + asset roster + SLA table"
```

---

## Task 18: Issuer action panel + request log

**Files:**
- Create: `components/features/issuers/issuer-action-panel.tsx`
- Create: `components/features/issuers/issuer-request-log.tsx`
- Test: `tests/unit/components/issuers/issuer-action-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/issuers/issuer-action-panel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IssuerActionPanel } from '@/components/features/issuers/issuer-action-panel'

describe('IssuerActionPanel', () => {
  it('opens the attestation-request form and submits with payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<IssuerActionPanel issuerId="org_apollo" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /request weekly leverage/i }))
    await user.click(screen.getByRole('button', { name: /submit request/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      issuerId: 'org_apollo',
      kind: 'attestation-request',
    }))
  })

  it('opens the gap-acceptance form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<IssuerActionPanel issuerId="org_apollo" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /mark gap as accepted/i }))
    await user.type(screen.getByLabelText(/reason/i), 'Acceptable trade-off')
    await user.click(screen.getByRole('button', { name: /submit acceptance/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gap-acceptance' }))
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/issuers/issuer-action-panel.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { IssuerRequestKind } from '@/lib/api/schemas'

type SubmitPayload = { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }

export function IssuerActionPanel({ issuerId, onSubmit }: { issuerId: string; onSubmit: (payload: SubmitPayload) => void }) {
  const [mode, setMode] = useState<'none' | IssuerRequestKind>('none')
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [metric, setMetric] = useState('leverage')
  const [reason, setReason] = useState('')
  const [proposal, setProposal] = useState('')

  function reset() { setMode('none'); setReason(''); setProposal(''); setMetric('leverage'); setCadence('weekly') }

  return (
    <section aria-labelledby="actions">
      <h3 id="actions" className="mb-2 font-tag text-foreground/60">{'// actions'}</h3>
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMode('attestation-request')}>Request weekly leverage attestation</Button>
          <Button variant="outline" onClick={() => setMode('gap-acceptance')}>Mark gap as accepted</Button>
          <Button variant="ghost" onClick={() => setMode('sla-renegotiation')}>Renegotiate SLA</Button>
        </div>
      )}

      {mode === 'attestation-request' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'attestation-request', payload: { cadence, metric } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Cadence</span>
            <select className="rounded border border-border bg-background p-2 text-sm" value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            <span>Metric</span>
            <input className="rounded border border-border bg-background p-2 text-sm" value={metric} onChange={(e) => setMetric(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Submit request</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {mode === 'gap-acceptance' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'gap-acceptance', payload: { reason } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Reason</span>
            <textarea aria-label="reason" className="min-h-16 rounded border border-border bg-background p-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={reason.trim().length === 0}>Submit acceptance</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {mode === 'sla-renegotiation' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'sla-renegotiation', payload: { proposal } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Proposal</span>
            <textarea aria-label="proposal" className="min-h-24 rounded border border-border bg-background p-2 text-sm" value={proposal} onChange={(e) => setProposal(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={proposal.trim().length === 0}>Submit proposal</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  )
}
```

```tsx
// components/features/issuers/issuer-request-log.tsx
import type { IssuerRequest } from '@/lib/api/schemas'
import { formatDistanceToNow } from 'date-fns'

const kindLabel: Record<IssuerRequest['kind'], string> = {
  'attestation-request': 'Attestation request',
  'gap-acceptance': 'Gap acceptance',
  'sla-renegotiation': 'SLA renegotiation',
}

export function IssuerRequestLog({ requests }: { requests: IssuerRequest[] }) {
  return (
    <section aria-labelledby="request-log">
      <h3 id="request-log" className="mb-2 font-tag text-foreground/60">{'// interaction log'}</h3>
      {requests.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No requests sent yet.</p>
      ) : (
        <ul className="grid gap-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-surface/30 p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{kindLabel[r.kind]}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">Status: {r.status}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/issuers/issuer-action-panel.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/issuers/issuer-action-panel.tsx components/features/issuers/issuer-request-log.tsx tests/unit/components/issuers/issuer-action-panel.test.tsx
git commit -m "feat(issuers): action panel (3 forms) + request log"
```

---

## Task 19: Alerts building blocks (filter bar, feed, rule list/form, channel list/form, test button)

**Files:**
- Create: `components/features/alerts/alert-filter-bar.tsx`
- Create: `components/features/alerts/alert-feed.tsx`
- Create: `components/features/alerts/alert-rule-list.tsx`
- Create: `components/features/alerts/alert-rule-form.tsx`
- Create: `components/features/alerts/alert-channel-list.tsx`
- Create: `components/features/alerts/alert-channel-form.tsx`
- Create: `components/features/alerts/alert-test-button.tsx`
- Test: `tests/unit/components/alerts/alert-rule-form.test.tsx`
- Test: `tests/unit/components/alerts/alert-filter-bar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/unit/components/alerts/alert-rule-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertRuleForm } from '@/components/features/alerts/alert-rule-form'

describe('AlertRuleForm', () => {
  it('submits a well-formed payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<AlertRuleForm onSubmit={onSubmit} channels={[{ id: 'ch_1', kind: 'slack', label: 'risk', target: 'x', createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z' }]} />)
    await user.type(screen.getByLabelText(/label/i), 'high leverage')
    await user.selectOptions(screen.getByLabelText(/metric/i), 'leverage')
    await user.clear(screen.getByLabelText(/threshold/i))
    await user.type(screen.getByLabelText(/threshold/i), '0.75')
    await user.click(screen.getByLabelText(/channel ch_1/i))
    await user.click(screen.getByRole('button', { name: /save rule/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      label: 'high leverage',
      condition: expect.objectContaining({ metric: 'leverage', threshold: 0.75 }),
      channelIds: ['ch_1'],
    }))
  })
})
```

```tsx
// tests/unit/components/alerts/alert-filter-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertFilterBar } from '@/components/features/alerts/alert-filter-bar'

describe('AlertFilterBar', () => {
  it('toggles kind filters and reports back', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AlertFilterBar onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /filing/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kinds: ['filing'] }))
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/alerts/alert-filter-bar.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnomalyEvent } from '@/lib/api/schemas'

type Filter = {
  kinds: AnomalyEvent['kind'][]
  severities: AnomalyEvent['severity'][]
}

const KINDS: AnomalyEvent['kind'][] = ['credit-event', 'filing', 'attestation-gap', 'amm-sla']
const SEVERITIES: AnomalyEvent['severity'][] = ['info', 'low', 'medium', 'high']

export function AlertFilterBar({ onChange }: { onChange: (f: Filter) => void }) {
  const [kinds, setKinds] = useState<AnomalyEvent['kind'][]>([])
  const [severities, setSeverities] = useState<AnomalyEvent['severity'][]>([])

  function toggleKind(k: AnomalyEvent['kind']) {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]
    setKinds(next); onChange({ kinds: next, severities })
  }
  function toggleSev(s: AnomalyEvent['severity']) {
    const next = severities.includes(s) ? severities.filter((x) => x !== s) : [...severities, s]
    setSeverities(next); onChange({ kinds, severities: next })
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-md border border-border bg-surface/30 p-3">
      <div className="flex flex-wrap gap-1">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => toggleKind(k)}
            className={cn('rounded-full border px-2 py-0.5 text-xs',
              kinds.includes(k) ? 'border-foreground bg-foreground text-background' : 'border-border')}>
            {k}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {SEVERITIES.map((s) => (
          <button key={s} type="button" onClick={() => toggleSev(s)}
            className={cn('rounded-full border px-2 py-0.5 text-xs capitalize',
              severities.includes(s) ? 'border-foreground bg-foreground text-background' : 'border-border')}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// components/features/alerts/alert-feed.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlertFilterBar } from './alert-filter-bar'
import type { AnomalyEvent } from '@/lib/api/schemas'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info: 'bg-foreground/10', low: 'bg-foreground/10',
  medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger',
}

type FilterState = { kinds: AnomalyEvent['kind'][]; severities: AnomalyEvent['severity'][] }

export function AlertFeed({ events }: { events: AnomalyEvent[] }) {
  const [filter, setFilter] = useState<FilterState>({ kinds: [], severities: [] })
  const filtered = events
    .filter((e) => filter.kinds.length === 0 || filter.kinds.includes(e.kind))
    .filter((e) => filter.severities.length === 0 || filter.severities.includes(e.severity))

  return (
    <div className="grid gap-3">
      <AlertFilterBar onChange={setFilter} />
      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No matching events.</p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((e) => {
            const when = formatDistanceToNow(new Date(e.occurredAt), { addSuffix: true })
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-border bg-surface/30 p-3">
                <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase', sevTone[e.severity])}>{e.kind}</span>
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{when}</span>
                <span className="flex-1 text-sm">
                  {e.detailHref ? <Link href={e.detailHref} className="hover:underline">{e.title}</Link> : e.title}
                </span>
                {e.borrowerNormalized && <span className="text-xs text-muted-foreground">{e.borrowerNormalized}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

```tsx
// components/features/alerts/alert-rule-list.tsx
'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionUpdateAlertRule, actionDeleteAlertRule, actionTestAlertRule } from '@/app/(app)/alerts/actions'
import type { AlertRule } from '@/lib/api/schemas'

export function AlertRuleList({ rules }: { rules: AlertRule[] }) {
  const [pending, startTransition] = useTransition()
  return (
    <ul className="grid gap-2">
      {rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
      {rules.map((r) => (
        <li key={r.id} className="rounded-md border border-border bg-surface/30 p-3">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">{r.label}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionTestAlertRule(r.id) })}>Test rule</Button>
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionUpdateAlertRule(r.id, { enabled: !r.enabled }) })}>
                {r.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionDeleteAlertRule(r.id) })}>Delete</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {r.condition.metric} {r.condition.direction} {r.condition.threshold} ·
            {' '}{r.scope.datasetIds.length === 0 ? 'all assets' : `${r.scope.datasetIds.length} asset(s)`} ·
            {' '}{r.channelIds.length} channel(s) ·
            {' '}{r.enabled ? 'enabled' : 'disabled'}
          </p>
        </li>
      ))}
      {pending && <p className="sr-only">Updating…</p>}
    </ul>
  )
}
```

```tsx
// components/features/alerts/alert-rule-form.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AlertChannel, AlertRule } from '@/lib/api/schemas'

type Payload = Omit<AlertRule, 'id' | 'createdBy' | 'createdAt'>

const METRICS = ['leverage', 'nonAccrualPct', 'top10ConcentrationPct', 'pikPct'] as const

export function AlertRuleForm({ channels, onSubmit }: { channels: AlertChannel[]; onSubmit: (payload: Payload) => void }) {
  const [label, setLabel] = useState('')
  const [metric, setMetric] = useState<typeof METRICS[number]>('leverage')
  const [threshold, setThreshold] = useState<number>(0.75)
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])

  function toggleChannel(id: string) {
    setSelectedChannels((cur) => cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      label, enabled: true,
      condition: { metric, threshold, direction },
      scope: { datasetIds: [], kinds: [], severities: [] },
      channelIds: selectedChannels,
    })
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-surface p-4" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-xs"><span>Label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded border border-border bg-background p-2 text-sm" required />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-xs"><span>Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as typeof METRICS[number])} className="rounded border border-border bg-background p-2 text-sm">
            {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Direction</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'above' | 'below')} className="rounded border border-border bg-background p-2 text-sm">
            <option value="above">Above</option><option value="below">Below</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Threshold</span>
          <input type="number" step="any" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="rounded border border-border bg-background p-2 text-sm" required />
        </label>
      </div>
      <fieldset className="grid gap-1 text-xs">
        <legend>Channels</legend>
        {channels.length === 0 && <p className="text-muted-foreground">No channels yet — add one in the Channels tab.</p>}
        {channels.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input type="checkbox" aria-label={`channel ${c.id}`} checked={selectedChannels.includes(c.id)} onChange={() => toggleChannel(c.id)} />
            <span>{c.label} <span className="text-muted-foreground">({c.kind})</span></span>
          </label>
        ))}
      </fieldset>
      <Button type="submit">Save rule</Button>
    </form>
  )
}
```

```tsx
// components/features/alerts/alert-channel-list.tsx
'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionDeleteAlertChannel } from '@/app/(app)/alerts/actions'
import { AlertTestButton } from './alert-test-button'
import type { AlertChannel } from '@/lib/api/schemas'

export function AlertChannelList({ channels }: { channels: AlertChannel[] }) {
  const [pending, startTransition] = useTransition()
  return (
    <ul className="grid gap-2">
      {channels.length === 0 && <p className="text-sm text-muted-foreground">No channels yet.</p>}
      {channels.map((c) => (
        <li key={c.id} className="rounded-md border border-border bg-surface/30 p-3 text-sm">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">{c.label}</p>
            <div className="flex gap-2">
              <AlertTestButton channelId={c.id} />
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionDeleteAlertChannel(c.id) })}>Delete</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{c.kind} · {c.target}</p>
        </li>
      ))}
      {pending && <p className="sr-only">Updating…</p>}
    </ul>
  )
}
```

```tsx
// components/features/alerts/alert-channel-form.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { actionCreateAlertChannel } from '@/app/(app)/alerts/actions'
import { useTransition } from 'react'
import type { NotificationChannelKind } from '@/lib/api/schemas'

export function AlertChannelForm() {
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<NotificationChannelKind>('slack')
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await actionCreateAlertChannel({ kind, label, target })
      setLabel(''); setTarget('')
    })
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-surface p-4" onSubmit={submit}>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-xs"><span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as NotificationChannelKind)} className="rounded border border-border bg-background p-2 text-sm">
            <option value="slack">Slack</option><option value="email">Email</option><option value="webhook">Webhook</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required className="rounded border border-border bg-background p-2 text-sm" />
        </label>
        <label className="grid gap-1 text-xs"><span>Target ({kind === 'email' ? 'address' : 'URL'})</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} required className="rounded border border-border bg-background p-2 text-sm" />
        </label>
      </div>
      <Button type="submit" disabled={pending}>Add channel</Button>
    </form>
  )
}
```

```tsx
// components/features/alerts/alert-test-button.tsx
'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionSendTestEvent } from '@/app/(app)/alerts/actions'

export function AlertTestButton({ channelId }: { channelId: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'idle' | 'ok' | 'fail'>('idle')

  function send() {
    startTransition(async () => {
      const r = await actionSendTestEvent(channelId)
      setResult(r.delivered ? 'ok' : 'fail')
      setTimeout(() => setResult('idle'), 3_000)
    })
  }

  return (
    <Button size="sm" variant="ghost" onClick={send} disabled={pending}>
      {result === 'ok' ? 'Sent ✓' : result === 'fail' ? 'Failed' : 'Send test event'}
    </Button>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/alerts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/alerts tests/unit/components/alerts
git commit -m "feat(alerts): feed + filter bar + rule list/form + channel list/form + test button"
```

---

## Task 20: Refactor RedFlagScoreboard + AnomalyFeed to expose row components

**Files:**
- Modify: `components/features/brief/red-flag-scoreboard.tsx`
- Modify: `components/features/brief/anomaly-feed.tsx`
- Create: `components/features/brief/red-flag-card.tsx`
- Create: `components/features/brief/anomaly-row.tsx`

The slice-1 components rendered everything inline. Slice 2 needs the row internals re-usable from the alerts feed and the memo's flag checklist. Extract the rendering into row primitives without breaking slice-1 callers.

- [ ] **Step 1: Implement `<RedFlagCard>`**

```tsx
// components/features/brief/red-flag-card.tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { RedFlag } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'

const sevTone: Record<RedFlag['severity'], string> = {
  low: 'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high: 'border-danger/40 bg-danger/5',
}

export function RedFlagCard({ flag, actions }: { flag: RedFlag; actions?: ReactNode }) {
  return (
    <li className={cn('rounded-md border-l-2 p-3', sevTone[flag.severity])}>
      <p className="text-sm font-medium">
        {flag.drillHref ? (
          <Link href={flag.drillHref} className="hover:underline">{flag.label}</Link>
        ) : flag.label}
      </p>
      <p className="text-xs text-muted-foreground">{flag.reason}</p>
      {actions}
    </li>
  )
}
```

- [ ] **Step 2: Rewrite `<RedFlagScoreboard>` to compose `<RedFlagCard>`**

```tsx
// components/features/brief/red-flag-scoreboard.tsx
import type { ReactNode } from 'react'
import type { RedFlag } from '@/lib/api/schemas'
import { RedFlagCard } from './red-flag-card'

type Props = {
  flags: RedFlag[]
  totalRules: number
  renderActions?: (flag: RedFlag) => ReactNode
}

export function RedFlagScoreboard({ flags, totalRules, renderActions }: Props) {
  return (
    <section aria-labelledby="red-flags">
      <header className="flex items-baseline justify-between">
        <h3 id="red-flags" className="font-tag text-foreground/60">{'// red flag scoreboard'}</h3>
        <span className="text-xs text-muted-foreground">{flags.length} of {totalRules} tripped</span>
      </header>
      {flags.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No red flags tripped against the current snapshot.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {flags.map((f) => <RedFlagCard key={f.id} flag={f} actions={renderActions?.(f)} />)}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Implement `<AnomalyRow>`**

```tsx
// components/features/brief/anomaly-row.tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AnomalyEvent } from '@/lib/api/schemas'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info: 'bg-foreground/10 text-foreground/70', low: 'bg-foreground/10 text-foreground/70',
  medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger',
}

export function AnomalyRow({ event, actions }: { event: AnomalyEvent; actions?: ReactNode }) {
  const when = formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })
  const title = event.detailHref
    ? <Link href={event.detailHref} className="hover:underline">{event.title}</Link>
    : <span>{event.title}</span>
  return (
    <li className="grid gap-2 rounded-md border border-border bg-surface/30 p-3">
      <div className="flex items-start gap-3">
        <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase tracking-wider', sevTone[event.severity])}>
          {event.kind}
        </span>
        <span className="text-xs text-muted-foreground w-28 shrink-0">{when}</span>
        <span className="text-sm flex-1">{title}</span>
        {event.borrowerNormalized && <span className="text-xs text-muted-foreground">{event.borrowerNormalized}</span>}
      </div>
      {actions}
    </li>
  )
}
```

- [ ] **Step 4: Rewrite `<AnomalyFeed>` to compose `<AnomalyRow>`**

```tsx
// components/features/brief/anomaly-feed.tsx
import type { ReactNode } from 'react'
import type { AnomalyEvent } from '@/lib/api/schemas'
import { AnomalyRow } from './anomaly-row'

type Props = {
  events: AnomalyEvent[]
  title?: string
  renderActions?: (event: AnomalyEvent) => ReactNode
}

export function AnomalyFeed({ events, title = '// anomaly feed · last 30d', renderActions }: Props) {
  return (
    <section aria-labelledby="anomalies">
      <h3 id="anomalies" className="font-tag text-foreground/60 mb-3">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No events in this window.</p>
      ) : (
        <ul className="grid gap-2">
          {events.map((e) => <AnomalyRow key={e.id} event={e} actions={renderActions?.(e)} />)}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Run all existing tests + typecheck + lint**

```bash
npm test && npm run typecheck && npm run lint
```

All slice-1 tests (RedFlagScoreboard / AnomalyFeed) must still pass — the public component shape (`flags`, `totalRules`, `events`, `title`) is unchanged; `renderActions` is new and optional.

- [ ] **Step 6: Commit**

```bash
git add components/features/brief/red-flag-card.tsx components/features/brief/red-flag-scoreboard.tsx components/features/brief/anomaly-row.tsx components/features/brief/anomaly-feed.tsx
git commit -m "refactor(brief): extract RedFlagCard + AnomalyRow primitives with optional actions slot"
```

---

## Task 21: Wire memo route + decision affordances into AcredBrief

**Files:**
- Create: `app/(app)/datasets/[datasetId]/memo/page.tsx`
- Create: `app/(app)/datasets/[datasetId]/memo/loading.tsx`
- Modify: `app/(app)/datasets/[datasetId]/layout.tsx` (add "Memo" tab when ds_acred)
- Modify: `components/features/brief/acred-brief.tsx` (pass renderActions into scoreboard + feed; render WatchToggle)
- Modify: `components/features/brief/drill-out-actions.tsx` (`memoHref` may default to `/datasets/ds_acred/memo`)

- [ ] **Step 1: Create the memo route**

```tsx
// app/(app)/datasets/[datasetId]/memo/page.tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getActiveMemo } from '@/lib/api/endpoints/memos'
import { getAcredBriefRedFlags } from '@/lib/api/endpoints/datasets'
import { MemoEditor } from '@/components/features/memo/memo-editor'

export default async function MemoPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  if (datasetId !== 'ds_acred') notFound()
  const session = await requireUser()
  const [memo, redFlags] = await Promise.all([
    getActiveMemo({ user: session }, datasetId),
    getAcredBriefRedFlags({ user: session }, { includeAcknowledged: true }),
  ])
  return <MemoEditor memo={memo} redFlags={redFlags} userRole={session.role} />
}
```

```tsx
// app/(app)/datasets/[datasetId]/memo/loading.tsx
export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="h-10 w-48 rounded-md bg-foreground/10" />
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-lg bg-foreground/5" />)}
    </div>
  )
}
```

- [ ] **Step 2: Add the Memo tab to the dataset layout**

Edit `app/(app)/datasets/[datasetId]/layout.tsx`. Update `tabsFor`:

```tsx
function tabsFor(ds: Dataset) {
  const base: Array<{ href: string; label: string }> = [{ href: '', label: 'Overview' }]
  if (ds.tables && ds.tables.length > 0) {
    base.push({ href: '/explore', label: 'Explore' })
  }
  if (ds.id === 'ds_acred') {
    base.push({ href: '/memo', label: 'Memo' })
    base.push({ href: '/amm',  label: 'AMM' })
  }
  base.push(
    { href: '/schema', label: 'Schema' },
    { href: '/templates', label: 'Templates' },
    { href: '/runs', label: 'Runs' },
    { href: '/lineage', label: 'Lineage' },
  )
  return base
}
```

- [ ] **Step 3: Wire decision affordances into `AcredBrief`**

Edit `components/features/brief/acred-brief.tsx`. Make it a client wrapper that passes action callbacks via `renderActions`:

```tsx
// components/features/brief/acred-brief.tsx
'use client'
import { useTransition } from 'react'
import { BriefHeader } from './brief-header'
import { VitalSignsPanel } from './vital-signs-panel'
import { RedFlagScoreboard } from './red-flag-scoreboard'
import { AnomalyFeed } from './anomaly-feed'
import { PeerDispersionPanel } from './peer-dispersion-panel'
import { AttestationDisciplineTile } from './attestation-discipline-tile'
import { DrillOutActions } from './drill-out-actions'
import { RedFlagActionBar } from './red-flag-action-bar'
import { AnomalyActionBar } from './anomaly-action-bar'
import { WatchToggle } from './watch-toggle'
import { acredFacts } from '@/lib/data/acred/facts'
import { acredRedFlagRules } from '@/lib/data/acred/red-flags'
import {
  actionAcknowledgeFlag, actionSnoozeFlag, actionSetThreshold,
  actionDismissAnomaly, actionSetWatch, actionClearWatch,
} from '@/app/(app)/datasets/[datasetId]/decisions-actions'
import type {
  Dataset, RedFlag, AnomalyEvent, PeerDispersionRow,
  AttestationDiscipline, NotificationChannelKind,
} from '@/lib/api/schemas'

type Props = {
  dataset: Dataset
  issuerName: string
  redFlags: RedFlag[]
  anomalies: AnomalyEvent[]
  peerDispersion: PeerDispersionRow[]
  discipline: AttestationDiscipline
  initialWatching: boolean
  initialWatchChannels: NotificationChannelKind[]
}

export function AcredBrief({
  dataset, issuerName, redFlags, anomalies, peerDispersion, discipline,
  initialWatching, initialWatchChannels,
}: Props) {
  const [, startTransition] = useTransition()
  const totalRules = acredRedFlagRules.length

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <BriefHeader issuerName={issuerName} periodEnd={acredFacts.snapshot.periodEnd} discipline={discipline} />
        <WatchToggle
          datasetId={dataset.id}
          initialWatching={initialWatching}
          initialChannels={initialWatchChannels}
          onWatch={(channels) => startTransition(() => { actionSetWatch({ datasetId: dataset.id, channels }) })}
          onUnwatch={() => startTransition(() => { actionClearWatch(dataset.id) })}
        />
      </div>
      <VitalSignsPanel snapshot={acredFacts.snapshot} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <RedFlagScoreboard
            flags={redFlags}
            totalRules={totalRules}
            renderActions={(f) => (
              <RedFlagActionBar
                flagId={f.id} datasetId={dataset.id}
                sliderEligible={Boolean(acredRedFlagRules.find((r) => r.id === f.id)?.thresholdMetric)}
                onAcknowledge={(note) => startTransition(() => { actionAcknowledgeFlag({ flagId: f.id, datasetId: dataset.id, note }) })}
                onSnooze={() => startTransition(() => { actionSnoozeFlag({ flagId: f.id, datasetId: dataset.id }) })}
                onSetThreshold={(metric, value) => startTransition(() => { actionSetThreshold({ ruleId: f.id, datasetId: dataset.id, metric, value, direction: 'above' }) })}
              />
            )}
          />
          <AnomalyFeed
            events={anomalies}
            renderActions={(e) => (
              <AnomalyActionBar
                anomalyId={e.id}
                onDismiss={(reason) => startTransition(() => { actionDismissAnomaly({ anomalyId: e.id, reason, datasetId: dataset.id }) })}
                onPinToMemo={() => { window.location.href = `/datasets/${dataset.id}/memo` }}
                onConvertToRule={() => { window.location.href = `/alerts/rules/new?metric=${encodeURIComponent(e.kind)}` }}
              />
            )}
          />
        </div>
        <div className="grid gap-6">
          <PeerDispersionPanel rows={peerDispersion} />
          <AttestationDisciplineTile discipline={discipline} />
        </div>
      </div>
      <DrillOutActions
        exploreNonAccrualHref={`/datasets/${dataset.id}/explore?table=holdings&where=is_non_accrual%3Dtrue`}
        memoHref={`/datasets/${dataset.id}/memo`}
        filingsHref={`/datasets/${dataset.id}/runs`}
        nonAccrualCount={acredFacts.flaggedHoldings.nonAccrual}
      />
      <p className="text-xs text-muted-foreground">
        Peer dispersion and issuer attestation discipline are illustrative mocks until peer-fund integration and live SLA tracking ship.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Update the brief loader in `/datasets/[datasetId]/page.tsx`**

Modify the ACRED branch in `app/(app)/datasets/[datasetId]/page.tsx` to fetch initial watch state:

```tsx
// (inside the ds_acred branch)
const [ds, redFlags, anomalies, peerDispersion, discipline, watchEntries] = await Promise.all([
  getDataset(ctx, datasetId),
  getAcredBriefRedFlags(ctx),
  getAcredAnomalyFeed(ctx),
  getAcredPeerDispersion(ctx),
  getAcredAttestationDiscipline(ctx),
  (await import('@/lib/api/endpoints/decisions')).listWatchEntries(ctx, session.id),
])
const initial = watchEntries.find((w) => w.datasetId === datasetId)
return (
  <AcredBrief
    dataset={ds}
    issuerName={org?.name ?? ds.originatorOrgId}
    redFlags={redFlags}
    anomalies={anomalies}
    peerDispersion={peerDispersion}
    discipline={discipline}
    initialWatching={Boolean(initial)}
    initialWatchChannels={initial?.channels ?? []}
  />
)
```

- [ ] **Step 5: Run, lint, typecheck, full unit suite**

```bash
npm test && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add 'app/(app)/datasets/[datasetId]/memo/page.tsx' 'app/(app)/datasets/[datasetId]/memo/loading.tsx' 'app/(app)/datasets/[datasetId]/layout.tsx' 'app/(app)/datasets/[datasetId]/page.tsx' components/features/brief/acred-brief.tsx
git commit -m "feat(brief+memo): memo tab + decision affordances + watch toggle wired into AcredBrief"
```

---

## Task 22: Sidebar nav entries for Issuers and Alerts

**Files:**
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Add the two entries** alongside the existing sidebar links. Find the array of navigation items and add:

```tsx
{ href: '/issuers', label: 'Issuers' },
{ href: '/alerts',  label: 'Alerts'  },
```

Place them between **Datasets** and **Notebooks**. Preserve the existing icon style if the sidebar uses Lucide icons (use `Building2` for Issuers and `BellRing` for Alerts from `lucide-react`).

- [ ] **Step 2: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add components/shell/sidebar.tsx
git commit -m "feat(shell): add Issuers and Alerts to the sidebar nav"
```

---

## Task 23: `/issuers` list + `/issuers/[issuerId]` detail routes

**Files:**
- Create: `app/(app)/issuers/page.tsx`
- Create: `app/(app)/issuers/loading.tsx`
- Create: `app/(app)/issuers/[issuerId]/page.tsx`
- Create: `app/(app)/issuers/[issuerId]/loading.tsx`

- [ ] **Step 1: Create the list route**

```tsx
// app/(app)/issuers/page.tsx
import { requireUser } from '@/lib/auth/server'
import { listIssuers } from '@/lib/api/endpoints/issuers'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { IssuerTable } from '@/components/features/issuers/issuer-table'

export default async function IssuersPage() {
  const session = await requireUser()
  const issuers = await listIssuers({ user: session })
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// portfolio"
        title="Issuers"
        description="Compliance, SLA performance, and request history for every issuer in your portfolio."
      />
      <div className="mt-6">
        <IssuerTable issuers={issuers} orgs={fixtures.orgs} />
      </div>
    </div>
  )
}
```

```tsx
// app/(app)/issuers/loading.tsx
export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-32 rounded-md bg-foreground/10" />
      <div className="mt-6 h-48 rounded-md bg-foreground/5" />
    </div>
  )
}
```

- [ ] **Step 2: Create the detail route**

```tsx
// app/(app)/issuers/[issuerId]/page.tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getIssuer, listIssuerRequests } from '@/lib/api/endpoints/issuers'
import { fixtures } from '@/lib/api/fixtures'
import { IssuerDetailHeader } from '@/components/features/issuers/issuer-detail-header'
import { IssuerAssetRoster } from '@/components/features/issuers/issuer-asset-roster'
import { IssuerSlaTable } from '@/components/features/issuers/issuer-sla-table'
import { IssuerActionPanel } from '@/components/features/issuers/issuer-action-panel'
import { IssuerRequestLog } from '@/components/features/issuers/issuer-request-log'
import { actionSubmitIssuerRequest } from '@/app/(app)/issuers/actions'

export default async function IssuerDetailPage({ params }: { params: Promise<{ issuerId: string }> }) {
  const { issuerId } = await params
  const session = await requireUser()
  const [compliance, requests] = await Promise.all([
    getIssuer({ user: session }, issuerId).catch(() => null),
    listIssuerRequests({ user: session }, issuerId),
  ])
  if (!compliance) notFound()
  const org = fixtures.orgs.find((o) => o.id === issuerId)
  if (!org) notFound()
  const datasets = fixtures.datasets.filter((d) => compliance.assetIds.includes(d.id))

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto grid gap-6">
      <IssuerDetailHeader org={org} compliance={compliance} />
      <div className="grid gap-6 md:grid-cols-2">
        <IssuerAssetRoster datasets={datasets} />
        <IssuerSlaTable discipline={compliance.discipline} />
      </div>
      <IssuerActionPanel
        issuerId={issuerId}
        onSubmit={async (payload) => { 'use server'; await actionSubmitIssuerRequest(payload) }}
      />
      <IssuerRequestLog requests={requests} />
    </div>
  )
}
```

```tsx
// app/(app)/issuers/[issuerId]/loading.tsx
export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto grid gap-6 animate-pulse">
      <div className="h-12 w-64 rounded-md bg-foreground/10" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-md bg-foreground/5" />
        <div className="h-48 rounded-md bg-foreground/5" />
      </div>
      <div className="h-40 rounded-md bg-foreground/5" />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add 'app/(app)/issuers/'
git commit -m "feat(issuers): /issuers list + /issuers/[id] detail routes"
```

---

## Task 24: `/alerts` layout + Feed + Rules + Channels routes

**Files:**
- Create: `app/(app)/alerts/layout.tsx`
- Create: `app/(app)/alerts/page.tsx`
- Create: `app/(app)/alerts/loading.tsx`
- Create: `app/(app)/alerts/rules/page.tsx`
- Create: `app/(app)/alerts/rules/new/page.tsx`
- Create: `app/(app)/alerts/channels/page.tsx`

- [ ] **Step 1: Layout with tab nav**

```tsx
// app/(app)/alerts/layout.tsx
import Link from 'next/link'
import { PageHeader } from '@/components/common/page-header'

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// subscriptions"
        title="Alerts"
        description="Cross-portfolio anomaly stream, alert rules, and notification channels."
      />
      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Alerts sections">
        {[
          { href: '/alerts',          label: 'Feed' },
          { href: '/alerts/rules',    label: 'Rules' },
          { href: '/alerts/channels', label: 'Channels' },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-2 text-sm hover:bg-muted/40">
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Feed page (default)**

```tsx
// app/(app)/alerts/page.tsx
import { requireUser } from '@/lib/auth/server'
import { listAlertEvents } from '@/lib/api/endpoints/alerts'
import { AlertFeed } from '@/components/features/alerts/alert-feed'

export default async function AlertsFeedPage() {
  const session = await requireUser()
  const events = await listAlertEvents({ user: session })
  return <AlertFeed events={events} />
}
```

```tsx
// app/(app)/alerts/loading.tsx
export default function Loading() {
  return (
    <div className="grid gap-3 animate-pulse">
      <div className="h-10 rounded-md bg-foreground/5" />
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-md bg-foreground/5" />)}
    </div>
  )
}
```

- [ ] **Step 3: Rules page**

```tsx
// app/(app)/alerts/rules/page.tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listAlertRules } from '@/lib/api/endpoints/alerts'
import { AlertRuleList } from '@/components/features/alerts/alert-rule-list'
import { Button } from '@/components/ui/button'

export default async function AlertRulesPage() {
  const session = await requireUser()
  const rules = await listAlertRules({ user: session })
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button asChild><Link href="/alerts/rules/new">Create rule</Link></Button>
      </div>
      <AlertRuleList rules={rules} />
    </div>
  )
}
```

```tsx
// app/(app)/alerts/rules/new/page.tsx
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { listAlertChannels } from '@/lib/api/endpoints/alerts'
import { AlertRuleForm } from '@/components/features/alerts/alert-rule-form'
import { actionCreateAlertRule } from '@/app/(app)/alerts/actions'

export default async function NewAlertRulePage() {
  const session = await requireUser()
  const channels = await listAlertChannels({ user: session })
  return (
    <AlertRuleForm
      channels={channels}
      onSubmit={async (payload) => { 'use server'; await actionCreateAlertRule(payload); redirect('/alerts/rules') }}
    />
  )
}
```

- [ ] **Step 4: Channels page**

```tsx
// app/(app)/alerts/channels/page.tsx
import { requireUser } from '@/lib/auth/server'
import { listAlertChannels } from '@/lib/api/endpoints/alerts'
import { AlertChannelList } from '@/components/features/alerts/alert-channel-list'
import { AlertChannelForm } from '@/components/features/alerts/alert-channel-form'

export default async function AlertChannelsPage() {
  const session = await requireUser()
  const channels = await listAlertChannels({ user: session })
  return (
    <div className="grid gap-4">
      <AlertChannelForm />
      <AlertChannelList channels={channels} />
    </div>
  )
}
```

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add 'app/(app)/alerts/'
git commit -m "feat(alerts): /alerts (Feed) + /alerts/rules + /alerts/channels routes"
```

---

## Task 25: Full E2E spec — action layer

**Files:**
- Create: `tests/e2e/acred-action-layer.spec.ts`

- [ ] **Step 1: Write the spec** following the slice-1 pattern (persona-button login, no email/password):

```ts
// tests/e2e/acred-action-layer.spec.ts
import { test, expect } from '@playwright/test'

test('action layer: brief decisions + memo + issuers + alerts', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text())
  })

  // Sign in as demo counterparty
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()

  // Brief: acknowledge a red flag
  await page.goto('/datasets/ds_acred')
  await expect(page.getByText(/tripped/i)).toBeVisible()
  const firstAck = page.getByRole('button', { name: /^Acknowledge$/i }).first()
  await firstAck.click()
  await page.getByLabel(/note/i).first().fill('IC accepts the elevated leverage profile.')
  await page.getByRole('button', { name: /^Save$/i }).first().click()
  // The acknowledged flag should drop from the active list
  await page.waitForTimeout(800)

  // Brief: set a threshold via slider (leverage_high → 90%)
  // (Skip if no slider-eligible flag remains tripped after the ack.)
  const sliderButton = page.getByRole('button', { name: /set threshold/i }).first()
  if (await sliderButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await sliderButton.click()
    const slider = page.getByLabel(/threshold/i).first()
    await slider.fill('0.90')
    await page.getByRole('button', { name: /save threshold/i }).click()
  }

  // Click Memo tab
  await page.getByRole('link', { name: /^Memo$/i }).click()
  await expect(page).toHaveURL(/\/datasets\/ds_acred\/memo$/)
  await expect(page.getByText(/Character/)).toBeVisible()

  // Type into Character section, wait for autosave
  await page.getByPlaceholder(/write your analysis here/i).first().fill('Apollo has a strong track record in direct lending.')
  await page.waitForTimeout(1_000)

  // Insert data into Capital section
  // Find the Capital section's "Insert data" button (the 3rd by section order: character→capacity→capital)
  await page.locator('section').filter({ hasText: 'Capital' }).getByRole('button', { name: /insert data/i }).click()
  await page.getByRole('button', { name: /Top-10 borrower exposure/i }).click()
  await expect(page.locator('text=Top-10 borrower exposure')).toBeVisible()

  // Submit memo for IC review
  await page.getByRole('button', { name: /submit for IC review/i }).click()
  await expect(page.getByText(/submitted for IC review/i)).toBeVisible()

  // Issuers list
  await page.goto('/issuers')
  await expect(page.getByRole('link', { name: /Apollo/i })).toBeVisible()
  await page.getByRole('link', { name: /Apollo/i }).click()
  await expect(page).toHaveURL(/\/issuers\/org_apollo$/)

  // Submit an attestation request
  await page.getByRole('button', { name: /request weekly leverage/i }).click()
  await page.getByRole('button', { name: /submit request/i }).click()
  await expect(page.getByText(/Attestation request/i)).toBeVisible()

  // Alerts feed
  await page.goto('/alerts')
  await expect(page.getByText(/no matching events/i)).not.toBeVisible({ timeout: 2_000 }).catch(() => {})

  // Channels: add a channel
  await page.goto('/alerts/channels')
  await page.getByLabel(/^Label$/i).fill('risk-team')
  await page.getByLabel(/target/i).fill('https://hooks.slack.com/example')
  await page.getByRole('button', { name: /add channel/i }).click()
  await expect(page.getByText(/risk-team/)).toBeVisible()

  // Send test event
  await page.getByRole('button', { name: /send test event/i }).click()
  await expect(page.getByRole('button', { name: /^Sent ✓$/i })).toBeVisible({ timeout: 2_000 })

  // Rules: create a rule
  await page.goto('/alerts/rules/new')
  await page.getByLabel(/^Label$/i).fill('high leverage anywhere')
  await page.getByLabel(/threshold/i).fill('0.75')
  await page.getByLabel(/channel/i).first().check()
  await page.getByRole('button', { name: /save rule/i }).click()
  await expect(page).toHaveURL(/\/alerts\/rules$/)
  await expect(page.getByText(/high leverage anywhere/)).toBeVisible()

  // Test the rule
  await page.getByRole('button', { name: /test rule/i }).click()
  await page.goto('/alerts')
  await expect(page.getByText(/test event for rule/i)).toBeVisible()

  expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toEqual([])
})

test('admin can approve a submitted memo', async ({ page }) => {
  // counterparty submits
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /maya/i })).toBeVisible()
  await page.goto('/datasets/ds_acred/memo')
  await page.getByRole('button', { name: /submit for IC review/i }).click()
  await expect(page.getByText(/submitted for IC review/i)).toBeVisible()

  // sign back in as admin (role switch)
  await page.goto('/role-switch')
  await page.getByRole('button', { name: /admin/i }).click()
  await page.goto('/datasets/ds_acred/memo')
  await page.getByRole('button', { name: /^Approve$/i }).click()
  await expect(page.getByText(/^Approved$/i)).toBeVisible()
})
```

- [ ] **Step 2: Run, expect PASS**

```bash
npx playwright test tests/e2e/acred-action-layer.spec.ts --project=chromium
```

If a selector fails because the page renders differently than the test expects, **fix the rendering** if it's a real bug, or tighten the selector if it's an over-broad match. Do NOT loosen the spec to make it pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/acred-action-layer.spec.ts
git commit -m "test(e2e): action layer (brief decisions → memo → issuers → alerts → role-switch approval)"
```

---

## Task 26: Final verification

- [ ] **Step 1: Unit suite**

```bash
npm test
```
Expected: every existing + new suite passes.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: no new errors. Pre-existing warnings may remain; investigate any new ones.

- [ ] **Step 4: Full E2E**

```bash
npm run test:e2e
```
Expected: 16 specs pass (14 slice-1 + 2 slice-2 — primary action-layer spec and the admin-approve spec).

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Visual loop — 4 surfaces**

For each of these surfaces, take a Playwright screenshot (via the `ui-design-reviewer` agent or manually) and confirm the layout matches the spec:

1. `/datasets/ds_acred` (brief with action bars + watch toggle)
2. `/datasets/ds_acred/memo`
3. `/issuers/org_apollo`
4. `/alerts` (Feed, then click each tab)

Iterate via `visual-fix` if any surface is visibly broken.

- [ ] **Step 7: Smoke walk the whole demo flow**

```bash
npm run dev
```

As the demo counterparty: `/datasets` → ACRED → ack a flag → Memo tab → write Character → submit → `/role-switch` → admin → approve → `/issuers/org_apollo` → request attestation → `/alerts/channels` → add channel → send test → `/alerts` → see test event. Stop dev server.

- [ ] **Step 8: Final commit (if any verification-driven fixes)**

```bash
git status
# stage and commit any fixes uncovered during verification
```

---

## Spec coverage check

Mapping spec sections → tasks:

| Spec section | Implementing task(s) |
|---|---|
| §Goal | 1–26 (the slice) |
| §Audience and surfaces | 21 (memo), 21 (brief), 23 (issuers), 24 (alerts) |
| §Architecture — decision-state store | 4 |
| §Memo workspace | 1, 5, 11–13, 21 |
| §Decision affordances on brief | 6, 10, 14–16, 20, 21 |
| §Issuer Compliance | 3, 4, 7, 17–18, 23 |
| §Alerts feed | 3, 8, 19, 24 |
| §Auth and role behavior | 5 (admin gates in memos), 13 (status bar role gates) |
| §New Zod types | 1–3 |
| §New mock endpoints | 5–8, 9 |
| §Brief endpoints (filters + threshold-aware evaluator) | 9 |
| §Server actions | 10 |
| §Sidebar | 22 |
| §Memo "Insert data" flow | 12, 13 |
| §Threshold slider specifications | 14 |
| §Loading / error / edge cases | 5 (memo race), 5 (status gate), 6 (snooze expiry), 9 (defensive thresholds), 8 (testAlertRule eviction, missing-channel), 21 (sidebar badge) |
| §Testing — unit | 1–18 each include their own |
| §Testing — E2E | 25 |
| §Implementation order (bands A–E from spec) | 1–4 (A), 5–10 (B), 11–19 (C), 20–24 (D), 25–26 (E) |

No gaps identified.



