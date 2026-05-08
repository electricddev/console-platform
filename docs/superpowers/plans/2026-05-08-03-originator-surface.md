# Plan 03 — Originator Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the originator side of the platform end-to-end. After this plan, Tom (data owner at Maple Trade Finance) can: see the originator home with ingestion health and counterparty activity; manage data sources; walk through the connect-a-source wizard; edit and sign schemas with the AI privacy advisor; review and sign template approvals (private simulation); manage counterparty access via a permission matrix.

**Architecture:** Builds on Plan 01 + Plan 02. Adds originator-only routes inside `(app)/` gated by `requireRole('originator')`. New endpoints in `lib/api/endpoints/{sources,schemas-endpoint,approvals,access}.ts`. New fixtures for sources, ingestion events, approval requests, access grants. AI privacy advisor reuses `ai.privacyAnalysis` from Plan 01.

**Tech Stack:** Same as Plan 02. Adds nothing new.

**Source spec sections:** §4.3 Home (originator), §4.10 Originator Surface (Sources, Connect, Schemas, Approvals, Counterparty Access).

**Prerequisites:** Plans 01 + 02 merged.

---

## File structure

### New files

```
app/(app)/
  page.tsx                                  (modify) — originator branch fills in
  sources/
    layout.tsx                              requireRole('originator')
    page.tsx                                List
    loading.tsx
    new/
      page.tsx                              Connect wizard
      actions.ts
    [sourceId]/page.tsx                     Source detail
  schemas/
    layout.tsx                              requireRole('originator')
    page.tsx                                List
    loading.tsx
    new/page.tsx
    [schemaId]/
      page.tsx                              Editor
      versions/page.tsx                     History + diff
  approvals/
    layout.tsx                              requireRole('originator')
    page.tsx                                Inbox
    loading.tsx
    [approvalId]/page.tsx                   Review + sign
  access/
    layout.tsx                              requireRole('originator')
    page.tsx                                Counterparty × dataset matrix
components/features/
  home/
    originator-home.tsx
    ingestion-health-strip.tsx
    counterparty-activity.tsx
  sources/
    source-row.tsx
    source-health-pip.tsx
    ingestion-sparkline.tsx
    source-connect-wizard.tsx
  schemas/
    schema-editor.tsx
    schema-field-editor-row.tsx
    schema-version-diff.tsx
    privacy-advisor-panel.tsx
  approvals/
    approval-inbox.tsx
    approval-detail.tsx
    private-simulation-panel.tsx
    leakage-risk-meter.tsx
    similar-templates.tsx
  access/
    access-matrix.tsx
    permission-cell.tsx
    revoke-confirmation.tsx
lib/api/
  schemas.ts                                (extend) Source, IngestionEvent, ApprovalRequest, AccessGrant
  fixtures/
    sources.ts
    ingestion.ts
    approvals.ts
    access.ts
    (extend) index.ts
  endpoints/
    sources.ts                              list, get, pause, resume, getEvents
    schemas-endpoint.ts                     list, get, save, publish, listVersions
    approvals.ts                            list, get, approve, deny, requestChanges, simulatePrivate
    access.ts                               listGrants, grant, revoke
tests/
  unit/
    api/
      sources.test.ts
      schemas-endpoint.test.ts
      approvals.test.ts
      access.test.ts
  e2e/
    originator-journey.spec.ts
```

### Modified files

- `app/(app)/page.tsx` — keeps the `me.role === 'originator'` branch and renders `<OriginatorHome>`.
- `lib/api/schemas.ts` — adds Source, IngestionEvent, ApprovalRequest, AccessGrant.
- `lib/api/fixtures/index.ts` — re-exports new fixtures.

---

## Phase A — Schemas, fixtures, endpoints

## Task 1: Extend schemas

**Files:**
- Modify: `lib/api/schemas.ts`
- Create: `tests/unit/api/originator-schemas.test.ts`

- [ ] **Step 1: Append schemas**

```ts
// ---------- Sources ----------

export const SourceTypeSchema = z.enum(['postgres', 'mysql', 'snowflake', 'bigquery', 's3', 'rest-api', 'custom'])

export const SourceStatusSchema = z.enum(['healthy', 'lagging', 'paused', 'down'])

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SourceTypeSchema,
  ownerOrgId: z.string(),
  recordsProcessed: z.number().int().nonnegative(),
  lastCommitAt: z.string().datetime(),
  lagSeconds: z.number().nonnegative(),
  completenessPct: z.number().min(0).max(1),
  status: SourceStatusSchema,
  agentVersion: z.string(),
  agentInstalledAt: z.string().datetime(),
})
export type Source = z.infer<typeof SourceSchema>

export const IngestionEventSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  timestamp: z.string().datetime(),
  recordCount: z.number().int().nonnegative(),
  commitHash: z.string(),
  outcome: z.enum(['committed', 'partial', 'failed']),
  error: z.string().optional(),
})
export type IngestionEvent = z.infer<typeof IngestionEventSchema>

// ---------- Approvals ----------

export const ApprovalRequestStateSchema = z.enum(['pending', 'approved', 'denied', 'changes-requested'])

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateVersionId: z.string(),
  datasetId: z.string(),
  requesterId: z.string(),
  requesterOrgId: z.string(),
  requestedAt: z.string().datetime(),
  state: ApprovalRequestStateSchema,
  decidedAt: z.string().datetime().optional(),
  decidedBy: z.string().optional(),
  signature: z.string().optional(),
  rationale: z.string().optional(),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
})
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>

// ---------- Access ----------

export const PermissionLevelSchema = z.enum(['none', 'read', 'execute'])

export const AccessGrantSchema = z.object({
  id: z.string(),
  counterpartyOrgId: z.string(),
  datasetId: z.string(),
  level: PermissionLevelSchema,
  rateLimitPerDay: z.number().int().nonnegative(),
  allowedTemplateIds: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  grantedAt: z.string().datetime(),
  grantedBy: z.string(),
})
export type AccessGrant = z.infer<typeof AccessGrantSchema>
```

- [ ] **Step 2: Round-trip test**

`tests/unit/api/originator-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SourceSchema, ApprovalRequestSchema, AccessGrantSchema } from '@/lib/api/schemas'

describe('originator schemas', () => {
  it('Source rejects out-of-range completeness', () => {
    expect(() => SourceSchema.parse({
      id: 's1', name: 'x', type: 'postgres', ownerOrgId: 'org_x',
      recordsProcessed: 0, lastCommitAt: new Date().toISOString(),
      lagSeconds: 0, completenessPct: 1.5, status: 'healthy',
      agentVersion: '1.0.0', agentInstalledAt: new Date().toISOString(),
    })).toThrow()
  })
  it('ApprovalRequest defaults urgency to normal', () => {
    const a = ApprovalRequestSchema.parse({
      id: 'a1', templateId: 't1', templateVersionId: 't1_v1', datasetId: 'd1',
      requesterId: 'u1', requesterOrgId: 'o1', requestedAt: new Date().toISOString(),
      state: 'pending',
    })
    expect(a.urgency).toBe('normal')
  })
  it('AccessGrant defaults templateIds to empty', () => {
    const g = AccessGrantSchema.parse({
      id: 'g1', counterpartyOrgId: 'o1', datasetId: 'd1', level: 'execute',
      rateLimitPerDay: 100, grantedAt: new Date().toISOString(), grantedBy: 'u1',
    })
    expect(g.allowedTemplateIds).toEqual([])
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- originator-schemas
git add lib/api/schemas.ts tests/unit/api/originator-schemas.test.ts
git commit -m "feat(api): originator schemas (Source, IngestionEvent, ApprovalRequest, AccessGrant)"
```

---

## Task 2: Build originator fixtures

**Files:**
- Create: `lib/api/fixtures/sources.ts`
- Create: `lib/api/fixtures/ingestion.ts`
- Create: `lib/api/fixtures/approvals.ts`
- Create: `lib/api/fixtures/access.ts`
- Modify: `lib/api/fixtures/index.ts`

- [ ] **Step 1: Write `sources.ts`**

```ts
import type { Source } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const sourceFixtures: Source[] = [
  {
    id: 'src_mfone_pg',
    name: 'mF-ONE Postgres',
    type: 'postgres',
    ownerOrgId: 'org_tradefin',
    recordsProcessed: 14_823,
    lastCommitAt: ts(2),
    lagSeconds: 8,
    completenessPct: 0.99,
    status: 'healthy',
    agentVersion: '1.4.2',
    agentInstalledAt: '2025-09-01T12:00:00Z',
  },
  {
    id: 'src_flowapac_s3',
    name: 'FlowCredit APAC S3 drop',
    type: 's3',
    ownerOrgId: 'org_tradefin',
    recordsProcessed: 6_322,
    lastCommitAt: ts(540),
    lagSeconds: 32_400,
    completenessPct: 0.91,
    status: 'paused',
    agentVersion: '1.4.0',
    agentInstalledAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'src_creditbridge_pg',
    name: 'CreditBridge Postgres',
    type: 'postgres',
    ownerOrgId: 'org_creditbridge',
    recordsProcessed: 487,
    lastCommitAt: ts(180),
    lagSeconds: 60,
    completenessPct: 1.0,
    status: 'healthy',
    agentVersion: '1.4.2',
    agentInstalledAt: '2025-08-12T14:00:00Z',
  },
]
```

- [ ] **Step 2: Write `ingestion.ts`**

```ts
import type { IngestionEvent } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const ingestionFixtures: IngestionEvent[] = Array.from({ length: 24 }, (_, i) => ({
  id: `ing_${i + 1}`,
  sourceId: 'src_mfone_pg',
  timestamp: ts(i * 60),
  recordCount: 600 + Math.floor(Math.random() * 60),
  commitHash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0'),
  outcome: i === 14 ? 'partial' : 'committed',
  error: i === 14 ? 'Streaming gap detected at 14:00 UTC; auto-recovered.' : undefined,
}))
```

- [ ] **Step 3: Write `approvals.ts`**

```ts
import type { ApprovalRequest } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const approvalFixtures: ApprovalRequest[] = [
  {
    id: 'apv_001',
    templateId: 'tpl_advance_rate_by_sector',
    templateVersionId: 'tplv_advance_rate_v3',
    datasetId: 'ds_creditbridge',
    requesterId: 'usr_maya',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(120),
    state: 'pending',
    urgency: 'high',
  },
  {
    id: 'apv_002',
    templateId: 'tpl_default_rate_by_vintage',
    templateVersionId: 'tplv_default_rate_v2',
    datasetId: 'ds_mfone',
    requesterId: 'usr_admin',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(48 * 60),
    state: 'changes-requested',
    decidedAt: ts(40 * 60),
    decidedBy: 'usr_tom',
    rationale: 'Reduce parameter range; current lookback exposes single-deal vintages.',
    urgency: 'normal',
  },
  {
    id: 'apv_003',
    templateId: 'tpl_concentration_breaches',
    templateVersionId: 'tplv_concentration_v1',
    datasetId: 'ds_mfone',
    requesterId: 'usr_maya',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(60 * 24 * 30),
    state: 'approved',
    decidedAt: ts(60 * 24 * 30 - 60),
    decidedBy: 'usr_tom',
    signature: '0x' + 'cc'.repeat(20),
    urgency: 'normal',
  },
]
```

- [ ] **Step 4: Write `access.ts`**

```ts
import type { AccessGrant } from '@/lib/api/types'

export const accessFixtures: AccessGrant[] = [
  {
    id: 'agr_001',
    counterpartyOrgId: 'org_gauntlet',
    datasetId: 'ds_mfone',
    level: 'execute',
    rateLimitPerDay: 200,
    allowedTemplateIds: ['tpl_advance_rate_by_sector', 'tpl_concentration_breaches'],
    grantedAt: '2025-09-01T12:00:00Z',
    grantedBy: 'usr_tom',
  },
  {
    id: 'agr_002',
    counterpartyOrgId: 'org_infinifi',
    datasetId: 'ds_mfone',
    level: 'read',
    rateLimitPerDay: 50,
    allowedTemplateIds: [],
    grantedAt: '2025-11-15T08:00:00Z',
    grantedBy: 'usr_tom',
  },
  {
    id: 'agr_003',
    counterpartyOrgId: 'org_bitwise',
    datasetId: 'ds_creditbridge',
    level: 'execute',
    rateLimitPerDay: 100,
    allowedTemplateIds: ['tpl_default_rate_by_vintage'],
    expiresAt: '2026-12-31T23:59:59Z',
    grantedAt: '2026-01-10T10:00:00Z',
    grantedBy: 'usr_tom',
  },
]
```

- [ ] **Step 5: Re-export**

Edit `lib/api/fixtures/index.ts`:

```ts
import { sourceFixtures } from './sources'
import { ingestionFixtures } from './ingestion'
import { approvalFixtures } from './approvals'
import { accessFixtures } from './access'

// in the fixtures object:
//   sources: sourceFixtures,
//   ingestionEvents: ingestionFixtures,
//   approvals: approvalFixtures,
//   accessGrants: accessFixtures,
```

(Apply the diff to the existing `fixtures` object literal.)

- [ ] **Step 6: Round-trip + commit**

Append to `tests/unit/api/fixtures.test.ts`:

```ts
import { SourceSchema, ApprovalRequestSchema, AccessGrantSchema } from '@/lib/api/schemas'
describe('originator fixtures round-trip', () => {
  it('sources', () => fixtures.sources.forEach((s) => SourceSchema.parse(s)))
  it('approvals', () => fixtures.approvals.forEach((a) => ApprovalRequestSchema.parse(a)))
  it('access grants', () => fixtures.accessGrants.forEach((g) => AccessGrantSchema.parse(g)))
})
```

```bash
npm run test -- fixtures
git add lib/api/fixtures tests/unit/api/fixtures.test.ts
git commit -m "feat(api): originator fixtures (sources, ingestion, approvals, access)"
```

---

## Task 3: Build sources endpoints

**Files:**
- Create: `lib/api/endpoints/sources.ts`
- Create: `tests/unit/api/sources.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { listSources, getSource, pauseSource, resumeSource, getSourceEvents } from '@/lib/api/endpoints/sources'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('source endpoints', () => {
  it('listSources returns only orgs sources', async () => {
    const list = await listSources(ctx)
    expect(list.every((s) => s.ownerOrgId === 'org_tradefin')).toBe(true)
  })
  it('getSource by id', async () => {
    const s = await getSource(ctx, 'src_mfone_pg')
    expect(s.id).toBe('src_mfone_pg')
  })
  it('pauseSource flips status', async () => {
    await pauseSource(ctx, 'src_mfone_pg')
    const s = await getSource(ctx, 'src_mfone_pg')
    expect(s.status).toBe('paused')
    await resumeSource(ctx, 'src_mfone_pg')
    const back = await getSource(ctx, 'src_mfone_pg')
    expect(back.status).toBe('healthy')
  })
  it('getSourceEvents returns events', async () => {
    const evts = await getSourceEvents(ctx, 'src_mfone_pg')
    expect(evts.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Implement**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { SourceSchema, IngestionEventSchema } from '@/lib/api/schemas'
import type { Source, IngestionEvent } from '@/lib/api/types'

const state: Source[] = fixtures.sources.map((s) => ({ ...s }))

export const listSources = mockEndpoint(
  async (ctx: RequestContext): Promise<Source[]> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    return state.filter((s) => s.ownerOrgId === ctx.user!.orgId).map((s) => SourceSchema.parse(s))
  },
  { latencyMs: 160 }
)

export const getSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string): Promise<Source> => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    return SourceSchema.parse(s)
  },
  { latencyMs: 100 }
)

export const pauseSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string) => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    s.status = 'paused'
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const resumeSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string) => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    s.status = 'healthy'
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const getSourceEvents = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string): Promise<IngestionEvent[]> => {
    return fixtures.ingestionEvents.filter((e) => e.sourceId === sourceId).map((e) => IngestionEventSchema.parse(e))
  },
  { latencyMs: 120 }
)

export const connectSource = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { name: string; type: Source['type'] }): Promise<Source> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'src_' + Math.random().toString(36).slice(2, 8)
    const s: Source = {
      id,
      name: input.name,
      type: input.type,
      ownerOrgId: ctx.user.orgId,
      recordsProcessed: 0,
      lastCommitAt: new Date().toISOString(),
      lagSeconds: 0,
      completenessPct: 1,
      status: 'healthy',
      agentVersion: '1.4.2',
      agentInstalledAt: new Date().toISOString(),
    }
    state.unshift(s)
    return SourceSchema.parse(s)
  },
  { latencyMs: 300 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- sources
git add lib/api/endpoints/sources.ts tests/unit/api/sources.test.ts
git commit -m "feat(api): source endpoints (list, get, pause, resume, events, connect)"
```

---

## Task 4: Build schema endpoints

**Files:**
- Create: `lib/api/endpoints/schemas-endpoint.ts`
- Create: `tests/unit/api/schemas-endpoint.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { listSchemas, getSchema, saveSchemaDraft, publishSchema } from '@/lib/api/endpoints/schemas-endpoint'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('schema endpoints', () => {
  it('listSchemas returns schemas', async () => {
    const list = await listSchemas(ctx)
    expect(list.length).toBeGreaterThan(0)
  })
  it('getSchema returns one schema', async () => {
    const s = await getSchema(ctx, 'sch_mfone_v3')
    expect(s.fields.length).toBeGreaterThan(0)
  })
  it('saveSchemaDraft + publish increments version', async () => {
    const s = await getSchema(ctx, 'sch_mfone_v3')
    const draft = await saveSchemaDraft(ctx, { ...s, fields: [...s.fields] })
    const published = await publishSchema(ctx, draft.id)
    expect(published.version).toBeGreaterThan(s.version)
  })
})
```

- [ ] **Step 2: Implement**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { SchemaSchema } from '@/lib/api/schemas'
import type { Schema } from '@/lib/api/types'

const state: Schema[] = fixtures.schemas.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }))

export const listSchemas = mockEndpoint(
  async (_ctx: RequestContext): Promise<Schema[]> => {
    return state.map((s) => SchemaSchema.parse(s))
  },
  { latencyMs: 160 }
)

export const getSchema = mockEndpoint(
  async (_ctx: RequestContext, _signal, schemaId: string): Promise<Schema> => {
    const s = state.find((x) => x.id === schemaId)
    if (!s) throw new MockApiError('Schema not found', 404)
    return SchemaSchema.parse(s)
  },
  { latencyMs: 100 }
)

export const saveSchemaDraft = mockEndpoint(
  async (_ctx: RequestContext, _signal, draft: Schema): Promise<Schema> => {
    const id = draft.id.replace(/_v\d+$/, '') + '_draft_' + Math.random().toString(36).slice(2, 6)
    const next: Schema = { ...draft, id, version: draft.version + 1, publishedAt: new Date().toISOString(), signedAt: new Date().toISOString() }
    state.unshift(next)
    return SchemaSchema.parse(next)
  },
  { latencyMs: 220 }
)

export const publishSchema = mockEndpoint(
  async (ctx: RequestContext, _signal, schemaId: string): Promise<Schema> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const s = state.find((x) => x.id === schemaId)
    if (!s) throw new MockApiError('Schema not found', 404)
    s.signedBy = ctx.user.id
    s.signedAt = new Date().toISOString()
    s.publishedAt = new Date().toISOString()
    return SchemaSchema.parse(s)
  },
  { latencyMs: 280 }
)

export const listSchemaVersions = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Schema[]> => {
    return state.filter((s) => s.datasetId === datasetId).sort((a, b) => b.version - a.version).map((s) => SchemaSchema.parse(s))
  },
  { latencyMs: 140 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- schemas-endpoint
git add lib/api/endpoints/schemas-endpoint.ts tests/unit/api/schemas-endpoint.test.ts
git commit -m "feat(api): schema endpoints (list, get, save draft, publish, versions)"
```

---

## Task 5: Build approval endpoints

**Files:**
- Create: `lib/api/endpoints/approvals.ts`
- Create: `tests/unit/api/approvals.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { listApprovals, getApproval, approveRequest, denyRequest, requestChanges, simulatePrivate } from '@/lib/api/endpoints/approvals'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('approval endpoints', () => {
  it('listApprovals returns pending', async () => {
    const list = await listApprovals(ctx, { state: 'pending' })
    expect(list.every((a) => a.state === 'pending')).toBe(true)
  })
  it('approveRequest flips state and signs', async () => {
    const a = (await listApprovals(ctx, { state: 'pending' }))[0]
    const r = await approveRequest(ctx, { approvalId: a.id })
    expect(r.state).toBe('approved')
    expect(r.signature).toBeTruthy()
  })
  it('simulatePrivate returns synthetic shape but no leaked values', async () => {
    const r = await simulatePrivate(ctx, { approvalId: 'apv_001' })
    expect(r.summary).toBeTruthy()
    expect((r as unknown as { rawValues?: unknown }).rawValues).toBeUndefined()
  })
})
```

- [ ] **Step 2: Implement**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { ApprovalRequestSchema } from '@/lib/api/schemas'
import type { ApprovalRequest } from '@/lib/api/types'

const state: ApprovalRequest[] = fixtures.approvals.map((a) => ({ ...a }))

export type ApprovalFilters = { state?: ApprovalRequest['state'] }

export const listApprovals = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: ApprovalFilters = {}): Promise<ApprovalRequest[]> => {
    let list = state.slice()
    if (filters.state) list = list.filter((a) => a.state === filters.state)
    return list.map((a) => ApprovalRequestSchema.parse(a))
  },
  { latencyMs: 140 }
)

export const getApproval = mockEndpoint(
  async (_ctx: RequestContext, _signal, approvalId: string): Promise<ApprovalRequest> => {
    const a = state.find((x) => x.id === approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 100 }
)

export const approveRequest = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; constraintsJson?: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'approved'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.signature = '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0')
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 260 }
)

export const denyRequest = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; rationale: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'denied'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.rationale = input.rationale
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 200 }
)

export const requestChanges = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; rationale: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'changes-requested'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.rationale = input.rationale
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 200 }
)

/** Private simulation result. The originator sees a *summary* — never raw rows. */
export type PrivateSimulationResult = {
  summary: string
  bucketCount: number
  smallestBucket: number
  rowEstimate: number
  durationMs: number
}

export const simulatePrivate = mockEndpoint(
  async (_ctx: RequestContext, _signal, _input: { approvalId: string }): Promise<PrivateSimulationResult> => {
    // Deterministic mock — no rows leak.
    return {
      summary: 'Aggregation produces 5 buckets, smallest of size 12. No bucket falls below k-anonymity (k=10).',
      bucketCount: 5,
      smallestBucket: 12,
      rowEstimate: 487,
      durationMs: 1240,
    }
  },
  { latencyMs: 380 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- approvals
git add lib/api/endpoints/approvals.ts tests/unit/api/approvals.test.ts
git commit -m "feat(api): approval endpoints (list, get, approve, deny, request changes, private simulation)"
```

---

## Task 6: Build access endpoints

**Files:**
- Create: `lib/api/endpoints/access.ts`
- Create: `tests/unit/api/access.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { listGrants, grantAccess, revokeAccess } from '@/lib/api/endpoints/access'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('access endpoints', () => {
  it('listGrants returns grants', async () => {
    const g = await listGrants(ctx)
    expect(g.length).toBeGreaterThan(0)
  })
  it('grantAccess + revokeAccess', async () => {
    const g = await grantAccess(ctx, {
      counterpartyOrgId: 'org_bitwise',
      datasetId: 'ds_mfone',
      level: 'execute',
      rateLimitPerDay: 25,
      allowedTemplateIds: [],
    })
    expect(g.id).toMatch(/^agr_/)
    await revokeAccess(ctx, g.id)
    const after = await listGrants(ctx)
    expect(after.find((x) => x.id === g.id)?.level).toBe('none')
  })
})
```

- [ ] **Step 2: Implement**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { AccessGrantSchema } from '@/lib/api/schemas'
import type { AccessGrant, PermissionLevel } from '@/lib/api/types'

const state: AccessGrant[] = fixtures.accessGrants.map((g) => ({ ...g }))

export const listGrants = mockEndpoint(
  async (_ctx: RequestContext): Promise<AccessGrant[]> => {
    return state.map((g) => AccessGrantSchema.parse(g))
  },
  { latencyMs: 140 }
)

export type GrantInput = {
  counterpartyOrgId: string
  datasetId: string
  level: PermissionLevel
  rateLimitPerDay: number
  allowedTemplateIds: string[]
  expiresAt?: string
}

export const grantAccess = mockEndpoint(
  async (ctx: RequestContext, _signal, input: GrantInput): Promise<AccessGrant> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'agr_' + Math.random().toString(36).slice(2, 8)
    const grant: AccessGrant = {
      id,
      counterpartyOrgId: input.counterpartyOrgId,
      datasetId: input.datasetId,
      level: input.level,
      rateLimitPerDay: input.rateLimitPerDay,
      allowedTemplateIds: input.allowedTemplateIds,
      expiresAt: input.expiresAt,
      grantedAt: new Date().toISOString(),
      grantedBy: ctx.user.id,
    }
    state.unshift(grant)
    return AccessGrantSchema.parse(grant)
  },
  { latencyMs: 220 }
)

export const revokeAccess = mockEndpoint(
  async (_ctx: RequestContext, _signal, grantId: string) => {
    const g = state.find((x) => x.id === grantId)
    if (!g) throw new MockApiError('Grant not found', 404)
    g.level = 'none'
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- access
git add lib/api/endpoints/access.ts tests/unit/api/access.test.ts
git commit -m "feat(api): access endpoints (list, grant, revoke)"
```

---

## Phase B — Originator Home

## Task 7: Build the originator home

**Files:**
- Create: `components/features/home/originator-home.tsx`
- Create: `components/features/home/ingestion-health-strip.tsx`
- Create: `components/features/home/counterparty-activity.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Write `ingestion-health-strip.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct, fmtDuration, fmtRelativeTime } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Source } from '@/lib/api/types'

const TONE: Record<Source['status'], string> = {
  healthy: 'bg-success/15 text-success border-success/30',
  lagging: 'bg-warning/15 text-warning border-warning/30',
  paused: 'bg-muted text-muted-foreground border-border',
  down: 'bg-destructive/15 text-destructive border-destructive/30',
}

export function IngestionHealthStrip({ sources }: { sources: Source[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Ingestion health</CardTitle>
        <Link href="/sources" className="text-xs text-muted-foreground hover:text-foreground">View sources →</Link>
      </CardHeader>
      <CardContent className="grid gap-2">
        {sources.map((s) => (
          <Link key={s.id} href={`/sources/${s.id}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border/70 bg-surface/50 px-3 py-2 hover:bg-surface">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">{fmtNumber(s.recordsProcessed)} records · lag {fmtDuration(s.lagSeconds * 1000)}</p>
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">{fmtPct(s.completenessPct)}</span>
            <FreshnessIndicator timestamp={s.lastCommitAt} />
            <Badge variant="outline" className={TONE[s.status]}>{s.status}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write `counterparty-activity.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtRelativeTime } from '@/lib/format'
import { fixtures } from '@/lib/api/fixtures'
import type { Run } from '@/lib/api/types'

export function CounterpartyActivity({ runs }: { runs: Run[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Counterparty activity (last 7 days)</CardTitle></CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No activity in the past week.</p>
        ) : runs.map((r) => {
          const org = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
          return (
            <Link key={r.id} href={`/runs/${r.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{org?.name ?? r.runnerOrgId}</p>
                <p className="truncate text-xs text-muted-foreground">ran {r.templateId} on {r.datasetId}</p>
              </div>
              <span className="text-xs text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `originator-home.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber } from '@/lib/format'
import { MetricCard } from '@/components/features/home/metric-card'
import { IngestionHealthStrip } from './ingestion-health-strip'
import { CounterpartyActivity } from './counterparty-activity'
import type { Source, ApprovalRequest, Run } from '@/lib/api/types'

type Props = {
  sources: Source[]
  pendingApprovals: ApprovalRequest[]
  recentRuns: Run[]
}

export function OriginatorHome({ sources, pendingApprovals, recentRuns }: Props) {
  const overall = sources.length === 0 ? 1 : sources.reduce((a, s) => a + s.completenessPct, 0) / sources.length
  const lagging = sources.filter((s) => s.status === 'lagging' || s.status === 'down').length

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sources" value={fmtNumber(sources.length)} />
        <MetricCard label="Avg completeness 24h" value={`${(overall * 100).toFixed(1)}%`} />
        <MetricCard label="Pending approvals" value={fmtNumber(pendingApprovals.length)} delta={pendingApprovals.length > 0 ? { direction: 'up', label: 'review' } : undefined} />
        <MetricCard label="Lagging sources" value={fmtNumber(lagging)} delta={lagging > 0 ? { direction: 'up', label: 'investigate' } : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IngestionHealthStrip sources={sources} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pending approvals</CardTitle>
            <Link href="/approvals" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </CardHeader>
          <CardContent className="grid divide-y divide-border/60 px-0">
            {pendingApprovals.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No pending approvals.</p>
            ) : pendingApprovals.map((a) => (
              <Link key={a.id} href={`/approvals/${a.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.templateId}</p>
                  <p className="truncate text-xs text-muted-foreground">on {a.datasetId} · from {a.requesterOrgId}</p>
                </div>
                {a.urgency === 'high' ? <Badge className="bg-warning/15 text-warning border-warning/30">urgent</Badge> : <span className="text-xs text-muted-foreground">{a.state}</span>}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <CounterpartyActivity runs={recentRuns.slice(0, 10)} />
    </section>
  )
}
```

- [ ] **Step 4: Wire into `app/(app)/page.tsx`**

Replace the originator branch (currently a placeholder) with:

```tsx
  if (me.role === 'originator') {
    const [sources, pendingApprovals, recentRuns] = await Promise.all([
      (await import('@/lib/api/endpoints/sources')).listSources(ctx),
      (await import('@/lib/api/endpoints/approvals')).listApprovals(ctx, { state: 'pending' }),
      (await import('@/lib/api/endpoints/runs')).listRuns(ctx, {}),
    ])
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <PageHeader eyebrow={`// home · originator`} title={`Welcome, ${me.name.split(' ')[0]}`} description={`${org.name} — control plane for your data`} />
        <div className="mt-6">
          <OriginatorHome sources={sources} pendingApprovals={pendingApprovals} recentRuns={recentRuns} />
        </div>
      </div>
    )
  }
```

(Add `import { OriginatorHome } from '@/components/features/home/originator-home'` at the top.)

- [ ] **Step 5: Smoke + commit**

Run dev. Sign in as Demo Originator. Verify the four metric cards, ingestion health strip, pending approvals, counterparty activity.

```bash
git add components/features/home/ingestion-health-strip.tsx components/features/home/counterparty-activity.tsx components/features/home/originator-home.tsx app/\(app\)/page.tsx
git commit -m "feat(home): originator home with ingestion health, approvals, activity"
```

---

## Phase C — Sources

## Task 8: Build the sources list page

**Files:**
- Create: `app/(app)/sources/layout.tsx`
- Create: `app/(app)/sources/page.tsx`
- Create: `app/(app)/sources/loading.tsx`
- Create: `components/features/sources/ingestion-sparkline.tsx`

- [ ] **Step 1: Write the layout (role gate)**

```tsx
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/server'
export default async function SourcesLayout({ children }: { children: ReactNode }) {
  await requireRole('originator')
  return <>{children}</>
}
```

- [ ] **Step 2: Write `ingestion-sparkline.tsx`**

```tsx
'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function IngestionSparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Write the page**

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listSources } from '@/lib/api/endpoints/sources'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct, fmtDuration } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { IngestionSparkline } from '@/components/features/sources/ingestion-sparkline'
import { Plus } from 'lucide-react'

export default async function SourcesPage() {
  const session = await requireUser()
  const sources = await listSources({ user: session })

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// data plane"
        title="Sources"
        description="Every pipeline you've connected to Hyve. Click into a source for ingestion history and commit proofs."
        actions={<Button asChild><Link href="/sources/new"><Plus className="size-3.5" /> Connect source</Link></Button>}
      />
      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th>Name</th><th>Type</th><th className="text-right">Records</th><th className="text-right">Completeness</th><th>Lag</th><th>7-day volume</th><th>Last commit</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const fakeSpark = Array.from({ length: 24 }, () => 600 + Math.floor(Math.random() * 60))
              return (
                <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2"><Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.name}</Link></td>
                  <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{s.type}</Badge></td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(s.recordsProcessed)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(s.completenessPct)}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDuration(s.lagSeconds * 1000)}</td>
                  <td className="px-3 py-2"><IngestionSparkline values={fakeSpark} /></td>
                  <td className="px-3 py-2"><FreshnessIndicator timestamp={s.lastCommitAt} /></td>
                  <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{s.status}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Loading**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'
export default function Loading() { return <div className="px-6 py-6"><RowsSkeleton rows={6} /></div> }
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/sources components/features/sources/ingestion-sparkline.tsx
git commit -m "feat(sources): list page with sparkline and role gate"
```

---

## Task 9: Build the source detail page

**Files:**
- Create: `app/(app)/sources/[sourceId]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { requireUser } from '@/lib/auth/server'
import { getSource, getSourceEvents, pauseSource, resumeSource } from '@/lib/api/endpoints/sources'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KeyValue } from '@/components/common/key-value'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtNumber, fmtPct, fmtDate, fmtDuration, fmtRelativeTime } from '@/lib/format'

export default async function SourceDetail({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [source, events] = await Promise.all([getSource(ctx, sourceId), getSourceEvents(ctx, sourceId)])

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// source · ${source.type}`}
        title={source.name}
        description={`Agent v${source.agentVersion} · installed ${fmtRelativeTime(source.agentInstalledAt)}`}
        actions={
          <form action={async () => {
            'use server'
            if (source.status === 'paused') await resumeSource({ user: session }, sourceId)
            else await pauseSource({ user: session }, sourceId)
          }}>
            <Button type="submit" variant={source.status === 'paused' ? 'default' : 'outline'}>
              {source.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
          </form>
        }
      />

      <section className="mt-6 grid gap-4 md:grid-cols-4 rounded-lg border border-border bg-surface/40 p-4">
        <KeyValue label="Records processed" value={fmtNumber(source.recordsProcessed)} />
        <KeyValue label="Completeness" value={fmtPct(source.completenessPct)} />
        <KeyValue label="Lag" value={fmtDuration(source.lagSeconds * 1000)} />
        <KeyValue label="Status" value={<Badge variant="outline" className="font-tag text-[0.65rem]">{source.status}</Badge>} />
      </section>

      <section className="mt-6 grid gap-3">
        <h2 className="font-tag text-foreground/60">// recent ingestion events</h2>
        <Card>
          <CardContent className="grid divide-y divide-border/60 px-0">
            {events.slice(0, 50).map((e) => (
              <div key={e.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{fmtDate(e.timestamp)}</span>
                <span className="tabular-nums">{fmtNumber(e.recordCount)} records</span>
                <CopyableHash value={e.commitHash} />
                <Badge variant="outline" className={
                  e.outcome === 'committed' ? 'bg-success/15 text-success border-success/30' :
                  e.outcome === 'partial' ? 'bg-warning/15 text-warning border-warning/30' :
                  'bg-destructive/15 text-destructive border-destructive/30'
                }>{e.outcome}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/sources/\[sourceId\]
git commit -m "feat(sources): source detail with ingestion events and pause/resume"
```

---

## Task 10: Build the connect-source wizard

**Files:**
- Create: `app/(app)/sources/new/page.tsx`
- Create: `app/(app)/sources/new/actions.ts`

- [ ] **Step 1: Write the action**

```ts
'use server'

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/server'
import { connectSource } from '@/lib/api/endpoints/sources'
import type { Source } from '@/lib/api/types'

export async function createSource(form: FormData) {
  const session = await requireRole('originator')
  const name = String(form.get('name'))
  const type = String(form.get('type')) as Source['type']
  const s = await connectSource({ user: session }, { name, type })
  redirect(`/sources/${s.id}`)
}
```

- [ ] **Step 2: Write the page**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/page-header'
import { createSource } from './actions'

export default function NewSourcePage() {
  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <PageHeader eyebrow="// connect" title="Add a data source" description="Hyve Connect agent stays inside your environment. Sample/profile + raw data never leave." />
      <form action={createSource} className="mt-6 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">1. Source type</CardTitle>
            <CardDescription>Pick how Hyve Connect will read your data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select name="type" defaultValue="postgres">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['postgres', 'mysql', 'snowflake', 'bigquery', 's3', 'rest-api', 'custom'] as const).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">2. Name this source</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="name" className="sr-only">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. mF-ONE Postgres production replica" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">3. Install the agent</CardTitle>
            <CardDescription>Run inside your environment. Binary signature is verifiable.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs">
{`curl -fsSL https://get.hyve.xyz/connect | sh
hyve-connect install --workspace=$WORKSPACE_ID`}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Stub flow — for the demo we'll register the source as healthy and proceed to detail.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">Connect source</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/sources/new
git commit -m "feat(sources): connect-source wizard (stub install) and Server Action"
```

---

## Phase D — Schemas

## Task 11: Build the schemas list and editor

**Files:**
- Create: `app/(app)/schemas/layout.tsx`
- Create: `app/(app)/schemas/page.tsx`
- Create: `app/(app)/schemas/loading.tsx`
- Create: `app/(app)/schemas/[schemaId]/page.tsx`
- Create: `components/features/schemas/schema-editor.tsx`
- Create: `components/features/schemas/privacy-advisor-panel.tsx`

- [ ] **Step 1: Layout (role gate)**

```tsx
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/server'
export default async function SchemasLayout({ children }: { children: ReactNode }) {
  await requireRole('originator')
  return <>{children}</>
}
```

- [ ] **Step 2: List page**

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listSchemas } from '@/lib/api/endpoints/schemas-endpoint'
import { PageHeader } from '@/components/common/page-header'
import { fmtRelativeTime } from '@/lib/format'

export default async function SchemasPage() {
  const session = await requireUser()
  const schemas = await listSchemas({ user: session })
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// schemas" title="Queryable schemas" description="Define which fields counterparties can query and how. Versioned and signed." />
      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2"><th>Schema</th><th>Dataset</th><th>Version</th><th>Fields</th><th>Published</th></tr>
          </thead>
          <tbody>
            {schemas.map((s) => (
              <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/schemas/${s.id}`} className="font-medium hover:underline">{s.id}</Link></td>
                <td className="px-3 py-2 font-mono text-xs">{s.datasetId}</td>
                <td className="px-3 py-2 tabular-nums">v{s.version}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.fields.length}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(s.publishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Loading**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'
export default function Loading() { return <div className="px-6 py-6"><RowsSkeleton rows={6} /></div> }
```

- [ ] **Step 4: Privacy advisor panel**

`components/features/schemas/privacy-advisor-panel.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Schema } from '@/lib/api/types'

export function PrivacyAdvisorPanel({ schema }: { schema: Schema }) {
  const findings: { severity: 'warn' | 'critical'; message: string }[] = []
  for (const f of schema.fields) {
    if (f.exposure !== 'private' && f.isPii) {
      findings.push({ severity: 'critical', message: `Field "${f.name}" is flagged PII but exposure is ${f.exposure}.` })
    }
    if (f.exposure === 'aggregated-only' && (!f.minBucketSize || f.minBucketSize < schema.policy.kAnonymity)) {
      findings.push({ severity: 'warn', message: `Field "${f.name}" min-bucket-size below k-anonymity (${schema.policy.kAnonymity}).` })
    }
  }
  const ok = findings.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        {ok ? <ShieldCheck className="size-4 text-success" /> : <ShieldAlert className="size-4 text-warning" />}
        <CardTitle className="text-sm font-medium">AI privacy advisor</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {ok ? (
          <p className="text-muted-foreground">No leakage paths detected at current k-anonymity ({schema.policy.kAnonymity}).</p>
        ) : findings.map((f, i) => (
          <p key={i} className={f.severity === 'critical' ? 'text-destructive' : 'text-warning'}>• {f.message}</p>
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Schema editor**

`components/features/schemas/schema-editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { Schema, SchemaField } from '@/lib/api/types'

type Props = {
  initial: Schema
  onSave: (next: Schema) => Promise<{ id: string }>
  onPublish: (id: string) => Promise<{ version: number }>
}

export function SchemaEditor({ initial, onSave, onPublish }: Props) {
  const [schema, setSchema] = useState<Schema>(initial)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function setField(idx: number, patch: Partial<SchemaField>) {
    setSchema((s) => {
      const fields = s.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
      return { ...s, fields }
    })
  }

  async function save() {
    setBusy(true)
    const r = await onSave(schema)
    setDraftId(r.id)
    setBusy(false)
  }

  async function publish() {
    if (!draftId) return
    setBusy(true)
    await onPublish(draftId)
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Fields</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {schema.fields.map((f, i) => (
          <div key={f.name} className="grid grid-cols-[2fr_1fr_1fr_auto_auto] items-end gap-3 rounded-md border border-border/60 bg-surface/30 p-3">
            <div className="grid gap-1">
              <Label className="text-xs">Name</Label>
              <Input value={f.name} disabled className="font-mono text-xs" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Exposure</Label>
              <Select value={f.exposure} onValueChange={(v) => setField(i, { exposure: v as SchemaField['exposure'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="queryable">queryable</SelectItem>
                  <SelectItem value="aggregated-only">aggregated-only</SelectItem>
                  <SelectItem value="private">private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Min bucket</Label>
              <Input
                type="number"
                value={f.minBucketSize ?? ''}
                onChange={(e) => setField(i, { minBucketSize: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">PII</Label>
              <Switch checked={f.isPii} onCheckedChange={(v) => setField(i, { isPii: v })} />
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</Button>
          <Button onClick={publish} disabled={!draftId || busy}>Publish (sign)</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Detail page**

```tsx
import { requireUser } from '@/lib/auth/server'
import { getSchema, saveSchemaDraft, publishSchema } from '@/lib/api/endpoints/schemas-endpoint'
import { PageHeader } from '@/components/common/page-header'
import { SchemaEditor } from '@/components/features/schemas/schema-editor'
import { PrivacyAdvisorPanel } from '@/components/features/schemas/privacy-advisor-panel'

export default async function SchemaPage({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = await params
  const session = await requireUser()
  const schema = await getSchema({ user: session }, schemaId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow={`// schema · v${schema.version}`} title={schema.id} description={`Dataset ${schema.datasetId} · k-anonymity ${schema.policy.kAnonymity}`} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SchemaEditor
          initial={schema}
          onSave={async (next) => {
            'use server'
            const s = await saveSchemaDraft({ user: session }, next)
            return { id: s.id }
          }}
          onPublish={async (id) => {
            'use server'
            const s = await publishSchema({ user: session }, id)
            return { version: s.version }
          }}
        />
        <PrivacyAdvisorPanel schema={schema} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/schemas components/features/schemas
git commit -m "feat(schemas): list + editor with AI privacy advisor"
```

---

## Phase E — Approvals

## Task 12: Build the approvals inbox

**Files:**
- Create: `app/(app)/approvals/layout.tsx`
- Create: `app/(app)/approvals/page.tsx`

- [ ] **Step 1: Layout**

```tsx
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/server'
export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  await requireRole('originator')
  return <>{children}</>
}
```

- [ ] **Step 2: Page**

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listApprovals } from '@/lib/api/endpoints/approvals'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime } from '@/lib/format'

const STATES = ['pending', 'approved', 'denied', 'changes-requested'] as const

export default async function ApprovalsInbox() {
  const session = await requireUser()
  const all = await listApprovals({ user: session })

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// inbox"
        title="Template approvals"
        description="Counterparties propose templates against your data. Review the DSL, simulate privately, then sign or deny."
      />
      <div className="mt-6 grid gap-6">
        {STATES.map((state) => {
          const items = all.filter((a) => a.state === state)
          if (items.length === 0) return null
          return (
            <section key={state} className="grid gap-2">
              <h2 className="font-tag text-foreground/60">// {state}</h2>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface/60 text-left font-tag text-foreground/55">
                    <tr className="[&>th]:px-3 [&>th]:py-2"><th>Template</th><th>Dataset</th><th>From</th><th>Requested</th><th>Urgency</th></tr>
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const org = fixtures.orgs.find((o) => o.id === a.requesterOrgId)
                      return (
                        <tr key={a.id} className="border-t border-border/60 hover:bg-muted/40">
                          <td className="px-3 py-2"><Link href={`/approvals/${a.id}`} className="font-medium hover:underline">{a.templateId}</Link></td>
                          <td className="px-3 py-2 font-mono text-xs">{a.datasetId}</td>
                          <td className="px-3 py-2 text-muted-foreground">{org?.name ?? a.requesterOrgId}</td>
                          <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(a.requestedAt)}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className={a.urgency === 'high' ? 'bg-warning/15 text-warning border-warning/30' : 'font-tag text-[0.65rem]'}>{a.urgency}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/approvals
git commit -m "feat(approvals): inbox grouped by state"
```

---

## Task 13: Build the approval review page

**Files:**
- Create: `app/(app)/approvals/[approvalId]/page.tsx`
- Create: `components/features/approvals/leakage-risk-meter.tsx`
- Create: `components/features/approvals/private-simulation-panel.tsx`
- Create: `components/features/approvals/approval-decision-bar.tsx`

- [ ] **Step 1: Write `leakage-risk-meter.tsx`**

```tsx
import { fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export function LeakageRiskMeter({ score }: { score: number }) {
  const tone = score < 0.3 ? 'bg-success' : score < 0.6 ? 'bg-warning' : 'bg-destructive'
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className="font-tag text-foreground/55">// leakage risk</span>
        <span className="text-xs tabular-nums">{fmtPct(score)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn('h-2 rounded-full transition-all', tone)} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `private-simulation-panel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { PrivateSimulationResult } from '@/lib/api/endpoints/approvals'

type Props = {
  approvalId: string
  fetchSim: (approvalId: string) => Promise<PrivateSimulationResult>
}

export function PrivateSimulationPanel({ approvalId, fetchSim }: Props) {
  const [r, setR] = useState<PrivateSimulationResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const result = await fetchSim(approvalId)
    setR(result)
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Private simulation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Runs against your <strong>actual</strong> data. Counterparties never see these values.
        </p>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? <><Loader2 className="size-3.5 animate-spin" /> Running</> : 'Run private simulation'}
        </Button>
        {r && (
          <div className="grid gap-1 rounded-md border border-border/60 bg-surface/30 p-3">
            <p>{r.summary}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {r.bucketCount} buckets · smallest {r.smallestBucket} · {r.rowEstimate} rows · {r.durationMs} ms
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `approval-decision-bar.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  approvalId: string
  onApprove: (id: string) => Promise<void>
  onDeny: (id: string, rationale: string) => Promise<void>
  onRequestChanges: (id: string, rationale: string) => Promise<void>
}

export function ApprovalDecisionBar({ approvalId, onApprove, onDeny, onRequestChanges }: Props) {
  const [reason, setReason] = useState('')
  const [, start] = useTransition()
  const router = useRouter()

  function approve() { start(async () => { await onApprove(approvalId); router.refresh() }) }
  function deny() { if (!reason) return; start(async () => { await onDeny(approvalId, reason); router.refresh() }) }
  function requestChanges() { if (!reason) return; start(async () => { await onRequestChanges(approvalId, reason); router.refresh() }) }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface/40 p-4">
      <div className="grid flex-1 gap-1.5 min-w-64">
        <Label htmlFor="reason">Reason (required for deny / request changes)</Label>
        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button onClick={approve}>Approve &amp; sign</Button>
      <Button variant="outline" onClick={requestChanges}>Request changes</Button>
      <Button variant="destructive" onClick={deny}>Deny</Button>
    </div>
  )
}
```

- [ ] **Step 4: Detail page**

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getApproval, simulatePrivate, approveRequest, denyRequest, requestChanges } from '@/lib/api/endpoints/approvals'
import { getTemplate } from '@/lib/api/endpoints/templates'
import { ai } from '@/lib/api/endpoints/ai'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate } from '@/lib/format'
import { LeakageRiskMeter } from '@/components/features/approvals/leakage-risk-meter'
import { PrivateSimulationPanel } from '@/components/features/approvals/private-simulation-panel'
import { ApprovalDecisionBar } from '@/components/features/approvals/approval-decision-bar'

export default async function ApprovalDetail({ params }: { params: Promise<{ approvalId: string }> }) {
  const { approvalId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const a = await getApproval(ctx, approvalId)
  const tpl = await getTemplate(ctx, a.templateId)
  const privacy = await ai.privacyAnalysis(ctx, { dsl: tpl.dsl, schemaId: 'sch_mfone_v3' })
  const requesterOrg = fixtures.orgs.find((o) => o.id === a.requesterOrgId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// approval · ${a.state}`}
        title={tpl.name}
        description={<>Requested by <strong>{requesterOrg?.name}</strong> on <Link href={`/datasets/${a.datasetId}`} className="hover:underline">{a.datasetId}</Link></>}
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">DSL</CardTitle></CardHeader>
          <CardContent><pre className="overflow-auto rounded-md border border-border/60 bg-background p-3 font-mono text-xs">{tpl.dsl}</pre></CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Privacy analysis</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <LeakageRiskMeter score={privacy.riskScore} />
              <ul className="grid gap-1.5">
                {privacy.findings.map((f, i) => (
                  <li key={i} className="rounded-md border border-border/60 bg-surface/30 p-2">
                    <p className="font-medium">{f.message}</p>
                    {f.remediation && <p className="text-xs text-muted-foreground">→ {f.remediation}</p>}
                  </li>
                ))}
                {privacy.findings.length === 0 && <p className="text-xs text-muted-foreground">No leakage paths detected.</p>}
              </ul>
            </CardContent>
          </Card>
          <PrivateSimulationPanel approvalId={a.id} fetchSim={async (id) => { 'use server'; return simulatePrivate({ user: session }, { approvalId: id }) }} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3 rounded-lg border border-border bg-surface/40 p-4">
        <KeyValue label="Requested" value={fmtDate(a.requestedAt)} />
        <KeyValue label="Urgency" value={a.urgency} />
        <KeyValue label="State" value={a.state} />
      </section>

      {a.state === 'pending' && (
        <div className="mt-6">
          <ApprovalDecisionBar
            approvalId={a.id}
            onApprove={async (id) => { 'use server'; await approveRequest({ user: session }, { approvalId: id }) }}
            onDeny={async (id, rationale) => { 'use server'; await denyRequest({ user: session }, { approvalId: id, rationale }) }}
            onRequestChanges={async (id, rationale) => { 'use server'; await requestChanges({ user: session }, { approvalId: id, rationale }) }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/approvals/\[approvalId\] components/features/approvals
git commit -m "feat(approvals): review with privacy analysis, private simulation, decision bar"
```

---

## Phase F — Counterparty access

## Task 14: Build the access matrix

**Files:**
- Create: `app/(app)/access/layout.tsx`
- Create: `app/(app)/access/page.tsx`
- Create: `components/features/access/access-matrix.tsx`

- [ ] **Step 1: Layout**

```tsx
import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/server'
export default async function AccessLayout({ children }: { children: ReactNode }) {
  await requireRole('originator')
  return <>{children}</>
}
```

- [ ] **Step 2: Matrix component**

```tsx
import { Badge } from '@/components/ui/badge'
import { fmtNumber } from '@/lib/format'
import type { AccessGrant, Dataset, Org } from '@/lib/api/types'

type Props = {
  datasets: Dataset[]
  counterparties: Org[]
  grants: AccessGrant[]
}

const TONE: Record<AccessGrant['level'], string> = {
  none: 'bg-muted text-muted-foreground',
  read: 'bg-info/15 text-info border-info/30',
  execute: 'bg-success/15 text-success border-success/30',
}

export function AccessMatrix({ datasets, counterparties, grants }: Props) {
  function find(orgId: string, datasetId: string) {
    return grants.find((g) => g.counterpartyOrgId === orgId && g.datasetId === datasetId)
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr><th className="px-3 py-2">Counterparty \\ Dataset</th>{datasets.map((d) => <th key={d.id} className="px-3 py-2">{d.name}</th>)}</tr>
        </thead>
        <tbody>
          {counterparties.map((c) => (
            <tr key={c.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{c.name}</td>
              {datasets.map((d) => {
                const g = find(c.id, d.id)
                if (!g) return <td key={d.id} className="px-3 py-2 text-muted-foreground">—</td>
                return (
                  <td key={d.id} className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={TONE[g.level]}>{g.level}</Badge>
                      <span className="text-[0.65rem] text-muted-foreground">{fmtNumber(g.rateLimitPerDay)}/day</span>
                      {g.expiresAt && <span className="text-[0.65rem] text-muted-foreground">expires {g.expiresAt.slice(0, 10)}</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Page**

```tsx
import { requireUser } from '@/lib/auth/server'
import { listGrants } from '@/lib/api/endpoints/access'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { AccessMatrix } from '@/components/features/access/access-matrix'

export default async function AccessPage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [grants, datasets] = await Promise.all([listGrants(ctx), listDatasets(ctx, { originatorOrgId: session.orgId })])
  const counterpartyIds = Array.from(new Set(grants.map((g) => g.counterpartyOrgId)))
  const counterparties = fixtures.orgs.filter((o) => counterpartyIds.includes(o.id))

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// permissions"
        title="Counterparty access"
        description="Who can do what against your datasets. Time-bounded, rate-limited, revocable in one click."
      />
      <div className="mt-6">
        <AccessMatrix datasets={datasets} counterparties={counterparties} grants={grants} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/access components/features/access
git commit -m "feat(access): counterparty × dataset permission matrix"
```

---

## Phase G — Wire-up

## Task 15: E2E — originator journey

**Files:**
- Create: `tests/e2e/originator-journey.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from '@playwright/test'

test('originator: home → sources → schemas → approvals → access', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo originator/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, tom/i })).toBeVisible()

  await page.getByRole('link', { name: /sources/i }).first().click()
  await expect(page.getByRole('heading', { name: /sources/i })).toBeVisible()

  await page.getByRole('link', { name: /mF-ONE Postgres/i }).click()
  await expect(page.getByText(/agent v1\.4\.2/i)).toBeVisible()

  await page.getByRole('link', { name: /schemas/i }).first().click()
  await expect(page.getByRole('heading', { name: /queryable schemas/i })).toBeVisible()

  await page.getByRole('link', { name: /approvals/i }).first().click()
  await expect(page.getByRole('heading', { name: /template approvals/i })).toBeVisible()

  await page.getByRole('link', { name: /access/i }).first().click()
  await expect(page.getByRole('heading', { name: /counterparty access/i })).toBeVisible()
})
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:e2e -- originator-journey
git add tests/e2e/originator-journey.spec.ts
git commit -m "test(e2e): originator journey (home, sources, schemas, approvals, access)"
```

---

## Self-review

- [ ] All four quality gates pass.
- [ ] Demo Originator sign-in shows ingestion health, pending approvals, counterparty activity.
- [ ] Sources list + detail with pause/resume; connect wizard creates + redirects.
- [ ] Schemas list + editor with privacy advisor.
- [ ] Approvals inbox grouped by state; review page renders DSL, privacy, simulation, decision bar.
- [ ] Access matrix renders without crashing.
- [ ] Counterparty signed-in users get redirected/forbidden from `/sources`, `/schemas`, `/approvals`, `/access` (handled by `requireRole`).
- [ ] Originator E2E spec passes.

---

## Out of scope for Plan 03

- Schema version diff viewer with side-by-side rendering — Plan 06
- Bulk approve/deny — V2 polish
- Granular per-grant editor (rate limit + expiration form) — V2 polish (matrix is read-only in this plan; revoke action lives elsewhere)
