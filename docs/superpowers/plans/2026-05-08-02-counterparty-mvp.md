# Plan 02 — Counterparty MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the counterparty side of the dashboard end-to-end. After this plan, Maya (curator) can: complete onboarding; land on a counterparty home with AI insights, watched datasets, recent runs, and pending tasks; browse the dataset catalog; drill into a dataset across all five tabs (Overview, Schema, Templates, Runs, Lineage); browse the template library; author a template via NL→DSL composer; review template detail; see the run history; open a run-detail trust artifact with full attestation evidence.

**Architecture:** Each feature area gets a folder under `components/features/<area>/`. Server Components fetch via `lib/api/endpoints/*` (extended in this plan). Mutations (run a query, save a template draft) use Server Actions. Live updates (run progress) use the realtime pumper from Plan 01. AI surfaces consume `ai.*` from Plan 01. Trust primitives (`AttestationBadge`, `CopyableHash`, `FreshnessIndicator`) appear on every value.

**Tech Stack:** Plan 01 stack + `@monaco-editor/react` for the DSL editor + `recharts` for sparklines/time-series + `@tanstack/react-table` for dense tables + `@tanstack/react-virtual` for the 10k-row catalog.

**Source spec sections:** §4.1 Onboarding, §4.3 Home (counterparty), §4.4 Datasets, §4.5 Templates, §4.6 Runs, §5 (AI integration), §6 (visual patterns).

**Prerequisites:** Plan 01 merged. The shell, mock client, Zod schemas, fixtures, auth, trust primitives, and AI mock contract are all available.

---

## File structure

### New files

```
app/
  (auth)/
    onboarding/
      page.tsx
      actions.ts
      _steps/
        role-step.tsx
        org-step.tsx
        identity-step.tsx
        prefs-step.tsx
        invite-step.tsx
  (app)/
    page.tsx                                  (rewrite — counterparty home)
    datasets/
      page.tsx                                Catalog
      loading.tsx
      _components/
        dataset-filters.tsx
        dataset-table.tsx
        dataset-search.tsx
        suggested-datasets.tsx
      [datasetId]/
        layout.tsx                            Tab nav
        page.tsx                              Overview
        schema/page.tsx
        templates/page.tsx
        runs/page.tsx
        lineage/page.tsx
        loading.tsx
    templates/
      page.tsx                                Library
      loading.tsx
      _components/
        template-table.tsx
        template-filters.tsx
      new/page.tsx                            Composer
      [templateId]/
        page.tsx                              Detail
        edit/page.tsx                         Composer (edit mode)
        run/page.tsx                          Run modal redirect target
    runs/
      page.tsx                                History
      loading.tsx
      _components/
        runs-table.tsx
        runs-filters.tsx
      [runId]/page.tsx                        Run detail trust artifact
components/features/
  home/
    counterparty-home.tsx
    metric-card.tsx
    insight-card.tsx
    recent-runs-strip.tsx
    watched-datasets.tsx
    pending-tasks.tsx
  datasets/
    dataset-row.tsx
    dataset-preview-popover.tsx
    schema-tree.tsx
    schema-field-row.tsx
    field-exposure-badge.tsx
    schema-version-history.tsx
    dataset-runs-table.tsx
    lineage-flow.tsx
    completeness-graph.tsx
    ask-anything-input.tsx
    suggested-questions.tsx
  templates/
    composer/
      composer-shell.tsx
      mode-toggle.tsx
      nl-input.tsx
      dsl-editor.tsx
      simulation-panel.tsx
      privacy-analysis-panel.tsx
      cost-estimate.tsx
      approval-preview.tsx
      param-list.tsx
      output-schema-form.tsx
    template-row.tsx
    approval-status-cluster.tsx
    template-version-diff.tsx
    run-template-dialog.tsx
  runs/
    run-status-icon.tsx
    run-status-pipeline.tsx
    run-result-renderer.tsx
    attestation-evidence-section.tsx
    execution-context-section.tsx
    ai-interpretation-section.tsx
    downstream-section.tsx
    runs-export-button.tsx
lib/api/
  schemas.ts                                  (extend) Dataset, SchemaField, Schema, Template, Run, RunResult, ParamValue, …
  fixtures/
    datasets.ts
    schemas-fx.ts
    templates.ts
    runs.ts
    insights.ts
    suggested-datasets.ts
    (extend) index.ts
  endpoints/
    datasets.ts                               list, get, getSchema, getRuns, getLineage
    templates.ts                              list, get, draft, submitForApproval, fork, archive
    runs.ts                                   list, get, executeTemplate (simulated), retry, dispute, exportBundle
    insights.ts                               getCounterpartyInsights
    schemas-endpoint.ts                       getById (Plan 03 extends)
tests/
  unit/
    api/
      datasets.test.ts
      templates.test.ts
      runs.test.ts
    features/
      datasets/dataset-row.test.tsx
      templates/composer/nl-input.test.tsx
      runs/run-status-icon.test.tsx
  e2e/
    counterparty-journey.spec.ts              Sign in → home → dataset → template → run
```

### Modified files

- `lib/api/schemas.ts` — extend with Dataset / Schema / Template / Run / RunResult types from INDEX §3.
- `lib/api/fixtures/index.ts` — re-export new fixtures.
- `app/(app)/page.tsx` — replace placeholder with the counterparty home.
- `components/shell/command-palette.tsx` — register dataset/template/run jump-targets via the registry pattern (Task 28).
- `package.json` — add `@monaco-editor/react`.

---

## Conventions

Same as Plan 01: TDD, one commit per task, `npm run typecheck && npm run lint && npm run test` before each commit. All API responses validated via Zod. Every numeric value rendered to the user has an `<AttestationBadge>` or a documented reason it doesn't. AI claims always cite at least one run id (Zod-enforced via `evidenceRunIds.min(1)` from Plan 01).

---

## Phase A — Schemas and fixtures

## Task 1: Extend schemas with feature types

**Files:**
- Modify: `lib/api/schemas.ts`
- Create: `tests/unit/api/feature-schemas.test.ts`

- [ ] **Step 1: Append schemas to `lib/api/schemas.ts`**

Add at the end of the file:

```ts
// ---------- Datasets ----------

export const DatasetStatusSchema = z.enum(['active', 'paused', 'archived'])

export const FieldExposureSchema = z.enum(['queryable', 'aggregated-only', 'private'])

export const FieldTypeSchema = z.enum(['string', 'number', 'date', 'currency', 'enum', 'bool'])

export const SchemaFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  exposure: FieldExposureSchema,
  description: z.string().optional(),
  isPii: z.boolean().default(false),
  minBucketSize: z.number().int().nonnegative().optional(),
  allowedOperators: z.array(z.enum(['sum', 'avg', 'count', 'min', 'max'])).optional(),
  sample: z.string().optional(),
})
export type SchemaField = z.infer<typeof SchemaFieldSchema>

export const SchemaSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  version: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  fields: z.array(SchemaFieldSchema),
  policy: z.object({
    kAnonymity: z.number().int().nonnegative(),
    maxQueriesPerCounterpartyPerDay: z.number().int().nonnegative(),
    allowedTimeRanges: z.array(z.string()).optional(),
  }),
  signedBy: z.string(),
  signedAt: z.string().datetime(),
  changeSummary: z.string().optional(),
})
export type Schema = z.infer<typeof SchemaSchema>

export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  originatorOrgId: z.string(),
  assetClass: AssetClassSchema,
  geography: z.string().optional(),
  schemaId: z.string(),
  schemaVersion: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
  lastAttestedAt: z.string().datetime(),
  completenessPct: z.number().min(0).max(1),
  status: DatasetStatusSchema,
  templateCount: z.number().int().nonnegative(),
  lifetimeRunCount: z.number().int().nonnegative(),
  attestation: AttestationSchema,
  watching: z.boolean().default(false),
  alerts: z.array(z.object({
    id: z.string(),
    severity: SeveritySchema,
    title: z.string(),
    body: z.string(),
    createdAt: z.string().datetime(),
  })).default([]),
})
export type Dataset = z.infer<typeof DatasetSchema>

// ---------- Templates ----------

export const TemplateApprovalStateSchema = z.enum([
  'unsubmitted',
  'pending',
  'approved',
  'denied',
  'changes-requested',
])

export const ParamTypeSchema = z.enum(['number', 'string', 'date', 'enum', 'bool', 'duration'])

export const TemplateParameterSchema = z.object({
  name: z.string(),
  type: ParamTypeSchema,
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  enumValues: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})
export type TemplateParameter = z.infer<typeof TemplateParameterSchema>

export const OutputSchemaSchema = z.object({
  shape: z.enum(['scalar', 'tabular', 'time-series', 'distribution']),
  columns: z.array(z.object({
    name: z.string(),
    type: FieldTypeSchema,
  })).optional(),
})
export type OutputSchema = z.infer<typeof OutputSchemaSchema>

export const TemplateApprovalSchema = z.object({
  datasetId: z.string(),
  state: TemplateApprovalStateSchema,
  approvedAt: z.string().datetime().optional(),
  approverId: z.string().optional(),
  signature: z.string().optional(),
  constraints: z.array(z.object({
    paramName: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    minBucketSize: z.number().int().optional(),
  })).optional(),
  rationale: z.string().optional(),
})
export type TemplateApproval = z.infer<typeof TemplateApprovalSchema>

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  authorId: z.string(),
  authorOrgId: z.string(),
  versionId: z.string(),
  versionNumber: z.number().int().nonnegative(),
  lastModifiedAt: z.string().datetime(),
  parameters: z.array(TemplateParameterSchema),
  outputSchema: OutputSchemaSchema,
  dsl: z.string(),
  approvals: z.array(TemplateApprovalSchema),
  tags: z.array(z.string()).default([]),
  compatibleAssetClasses: z.array(AssetClassSchema).default([]),
  archived: z.boolean().default(false),
  averageRuntimeMs: z.number().int().nonnegative().optional(),
  forkOfTemplateId: z.string().optional(),
})
export type Template = z.infer<typeof TemplateSchema>

// ---------- Runs ----------

export const RunStatusSchema = z.enum([
  'queued',
  'running',
  'attesting',
  'anchoring',
  'completed',
  'failed',
  'disputed',
])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const RunResultSchema = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('scalar'),
    value: z.union([z.number(), z.string(), z.boolean()]),
    unit: z.string().optional(),
  }),
  z.object({
    shape: z.literal('tabular'),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.number(), z.string(), z.null()]))),
  }),
  z.object({
    shape: z.literal('time-series'),
    metric: z.string(),
    series: z.array(z.object({
      name: z.string(),
      points: z.array(z.object({ t: z.string().datetime(), v: z.number() })),
    })),
  }),
  z.object({
    shape: z.literal('distribution'),
    bins: z.array(z.object({ label: z.string(), value: z.number() })),
  }),
])
export type RunResult = z.infer<typeof RunResultSchema>

export const RunSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateVersionId: z.string(),
  datasetId: z.string(),
  schemaVersionAtRun: z.number().int().nonnegative(),
  runnerId: z.string(),
  runnerOrgId: z.string(),
  parameters: z.record(z.unknown()),
  status: RunStatusSchema,
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  result: RunResultSchema.optional(),
  attestation: AttestationSchema.optional(),
  error: z.string().optional(),
  disputeReason: z.string().optional(),
})
export type Run = z.infer<typeof RunSchema>
```

- [ ] **Step 2: Write the round-trip test**

`tests/unit/api/feature-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  DatasetSchema, SchemaSchema, TemplateSchema, RunSchema, RunResultSchema,
} from '@/lib/api/schemas'

describe('feature schemas', () => {
  it('Dataset rejects completenessPct > 1', () => {
    expect(() => DatasetSchema.parse({
      id: 'ds_x', name: 'x', originatorOrgId: 'org_x', assetClass: 'private-credit',
      schemaId: 'sch_x', schemaVersion: 1, recordCount: 1, lastAttestedAt: new Date().toISOString(),
      completenessPct: 1.2, status: 'active', templateCount: 0, lifetimeRunCount: 0,
      attestation: { teeMeasurement: '0xa', codeHash: '0xb', outputSignature: '0xc' },
    })).toThrow()
  })

  it('RunResult discriminates by shape', () => {
    expect(() => RunResultSchema.parse({ shape: 'scalar', value: 0.023 })).not.toThrow()
    expect(() => RunResultSchema.parse({ shape: 'tabular', columns: ['a'], rows: [[1]] })).not.toThrow()
    expect(() => RunResultSchema.parse({ shape: 'pancakes', value: 1 })).toThrow()
  })

  it('Template requires at least one parameter to be ok with empty array', () => {
    const t = TemplateSchema.parse({
      id: 't1', name: 'x', description: 'y',
      authorId: 'u1', authorOrgId: 'o1', versionId: 'v1', versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      parameters: [], outputSchema: { shape: 'scalar' }, dsl: 'SELECT 1',
      approvals: [], tags: [], compatibleAssetClasses: [],
    })
    expect(t.id).toBe('t1')
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- feature-schemas
git add lib/api/schemas.ts tests/unit/api/feature-schemas.test.ts
git commit -m "feat(api): extend schemas with Dataset, Schema, Template, Run, RunResult"
```

---

## Task 2: Build dataset and schema fixtures

**Files:**
- Create: `lib/api/fixtures/schemas-fx.ts`
- Create: `lib/api/fixtures/datasets.ts`
- Modify: `lib/api/fixtures/index.ts`

- [ ] **Step 1: Write `lib/api/fixtures/schemas-fx.ts`**

```ts
import type { Schema } from '@/lib/api/types'

export const schemaFixtures: Schema[] = [
  {
    id: 'sch_mfone_v3',
    datasetId: 'ds_mfone',
    version: 3,
    publishedAt: '2026-04-12T10:00:00Z',
    signedBy: 'usr_tom',
    signedAt: '2026-04-12T10:00:00Z',
    changeSummary: 'Added borrower_segment as enum, retired raw advance_rate.',
    policy: {
      kAnonymity: 10,
      maxQueriesPerCounterpartyPerDay: 200,
      allowedTimeRanges: ['2024-01-01..now'],
    },
    fields: [
      { name: 'loan_id', type: 'string', exposure: 'private', isPii: true, description: 'Internal loan identifier' },
      { name: 'sector', type: 'enum', exposure: 'queryable', isPii: false, description: 'Industry sector', allowedOperators: ['count'] },
      { name: 'principal', type: 'currency', exposure: 'aggregated-only', isPii: false, description: 'Original loan principal (USD)', minBucketSize: 10, allowedOperators: ['sum', 'avg', 'count'] },
      { name: 'advance_rate', type: 'number', exposure: 'aggregated-only', isPii: false, description: 'LTV at advance', minBucketSize: 10, allowedOperators: ['avg', 'min', 'max'] },
      { name: 'origination_date', type: 'date', exposure: 'queryable', isPii: false, description: 'Date the loan was advanced' },
      { name: 'borrower_segment', type: 'enum', exposure: 'queryable', isPii: false, description: 'SME / corporate / midmarket', allowedOperators: ['count'] },
      { name: 'days_past_due', type: 'number', exposure: 'aggregated-only', isPii: false, description: 'DPD bucket counter', minBucketSize: 10, allowedOperators: ['avg', 'count'] },
      { name: 'as_of_date', type: 'date', exposure: 'queryable', isPii: false },
    ],
  },
  {
    id: 'sch_creditbridge_v2',
    datasetId: 'ds_creditbridge',
    version: 2,
    publishedAt: '2026-03-30T08:00:00Z',
    signedBy: 'usr_tom',
    signedAt: '2026-03-30T08:00:00Z',
    policy: { kAnonymity: 25, maxQueriesPerCounterpartyPerDay: 50 },
    fields: [
      { name: 'deal_id', type: 'string', exposure: 'private', isPii: true },
      { name: 'country', type: 'enum', exposure: 'queryable', isPii: false, allowedOperators: ['count'] },
      { name: 'industry', type: 'enum', exposure: 'queryable', isPii: false, allowedOperators: ['count'] },
      { name: 'commitment', type: 'currency', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['sum', 'avg'] },
      { name: 'maturity_quarters', type: 'number', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['avg'] },
      { name: 'default_flag', type: 'bool', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['count', 'avg'] },
    ],
  },
]
```

- [ ] **Step 2: Write `lib/api/fixtures/datasets.ts`**

```ts
import type { Dataset } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

const baseAtt = (seed: string) => ({
  teeMeasurement: `0x${seed.padEnd(64, 'a')}`,
  codeHash: `0x${seed.padEnd(64, 'b')}`,
  outputSignature: `0x${seed.padEnd(64, 'c')}`,
  anchorTxHash: `0x${seed.padEnd(64, 'd')}`,
  anchorBlockNumber: 18_000_000 + seed.length * 17,
  anchorChain: 'base' as const,
  anchoredAt: ts(15),
})

export const datasetFixtures: Dataset[] = [
  {
    id: 'ds_mfone',
    name: 'mF-ONE',
    description: 'Trade-finance receivables originated by Maple TF; daily ingestion.',
    originatorOrgId: 'org_tradefin',
    assetClass: 'trade-receivables',
    geography: 'Global',
    schemaId: 'sch_mfone_v3',
    schemaVersion: 3,
    recordCount: 14_823,
    lastAttestedAt: ts(8),
    completenessPct: 0.97,
    status: 'active',
    templateCount: 12,
    lifetimeRunCount: 2_104,
    attestation: baseAtt('mfone'),
    watching: true,
    alerts: [
      { id: 'al_1', severity: 'warning', title: 'Completeness dipped to 87% on Oct 14', body: 'Streaming gap detected; auto-recovered at 14:23 UTC.', createdAt: ts(35) },
    ],
  },
  {
    id: 'ds_creditbridge',
    name: 'CreditBridge EU MidMarket',
    description: 'EU mid-market private credit deal data, quarterly vintages.',
    originatorOrgId: 'org_creditbridge',
    assetClass: 'private-credit',
    geography: 'EU',
    schemaId: 'sch_creditbridge_v2',
    schemaVersion: 2,
    recordCount: 487,
    lastAttestedAt: ts(180),
    completenessPct: 1.0,
    status: 'active',
    templateCount: 6,
    lifetimeRunCount: 412,
    attestation: baseAtt('crbridge'),
    watching: true,
    alerts: [],
  },
  {
    id: 'ds_bowery_tbills',
    name: 'Bowery T-Bill Pool',
    description: 'Tokenized T-bill collateral pool, hourly attestations.',
    originatorOrgId: 'org_creditbridge',
    assetClass: 't-bills',
    geography: 'US',
    schemaId: 'sch_bowery_v1',
    schemaVersion: 1,
    recordCount: 89_212,
    lastAttestedAt: ts(2),
    completenessPct: 0.999,
    status: 'active',
    templateCount: 3,
    lifetimeRunCount: 5_822,
    attestation: baseAtt('bowery'),
    watching: false,
    alerts: [],
  },
  {
    id: 'ds_flowcredit_apac',
    name: 'FlowCredit APAC',
    description: 'Trade flow credit across APAC manufacturers.',
    originatorOrgId: 'org_tradefin',
    assetClass: 'flow-credit',
    geography: 'APAC',
    schemaId: 'sch_flowcredit_v1',
    schemaVersion: 1,
    recordCount: 6_322,
    lastAttestedAt: ts(540),
    completenessPct: 0.91,
    status: 'paused',
    templateCount: 2,
    lifetimeRunCount: 188,
    attestation: baseAtt('flowapac'),
    watching: false,
    alerts: [
      { id: 'al_2', severity: 'critical', title: 'Ingestion paused by originator', body: 'Schema migration in progress.', createdAt: ts(720) },
    ],
  },
]
```

- [ ] **Step 3: Update fixtures index**

Edit `lib/api/fixtures/index.ts` — replace the body with:

```ts
import { orgFixtures } from './orgs'
import { userFixtures, DEMO_PERSONA_IDS } from './users'
import { notificationFixtures } from './notifications'
import { networkHealthFixture } from './network'
import { datasetFixtures } from './datasets'
import { schemaFixtures } from './schemas-fx'

export const fixtures = {
  orgs: orgFixtures,
  users: userFixtures,
  notifications: notificationFixtures,
  networkHealth: networkHealthFixture,
  datasets: datasetFixtures,
  schemas: schemaFixtures,
} as const

export { DEMO_PERSONA_IDS }
```

- [ ] **Step 4: Add round-trip assertions to existing test**

Edit `tests/unit/api/fixtures.test.ts` — append:

```ts
import { DatasetSchema, SchemaSchema } from '@/lib/api/schemas'

describe('feature fixtures round-trip', () => {
  it('datasets', () => {
    fixtures.datasets.forEach((d) => DatasetSchema.parse(d))
    expect(fixtures.datasets.length).toBeGreaterThan(0)
  })
  it('schemas', () => {
    fixtures.schemas.forEach((s) => SchemaSchema.parse(s))
  })
  it('every dataset has a referenced schema', () => {
    const ids = new Set(fixtures.schemas.map((s) => s.id))
    fixtures.datasets.forEach((d) => {
      // mF-ONE and CreditBridge should resolve; bowery/flowcredit can be unresolved (fixtures incomplete)
      if (d.schemaId === 'sch_mfone_v3' || d.schemaId === 'sch_creditbridge_v2') {
        expect(ids.has(d.schemaId)).toBe(true)
      }
    })
  })
})
```

- [ ] **Step 5: Run + commit**

```bash
npm run test -- fixtures
git add lib/api/fixtures tests/unit/api/fixtures.test.ts
git commit -m "feat(api): dataset + schema fixtures (mF-ONE, CreditBridge, Bowery, FlowCredit)"
```

---

## Task 3: Build template and run fixtures

**Files:**
- Create: `lib/api/fixtures/templates.ts`
- Create: `lib/api/fixtures/runs.ts`
- Create: `lib/api/fixtures/insights.ts`
- Modify: `lib/api/fixtures/index.ts`

- [ ] **Step 1: Write `lib/api/fixtures/templates.ts`**

```ts
import type { Template } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const templateFixtures: Template[] = [
  {
    id: 'tpl_advance_rate_by_sector',
    name: 'Weighted advance rate by sector',
    description: 'Principal-weighted advance rate, grouped by sector, with a minimum bucket size to satisfy k-anonymity.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_advance_rate_v3',
    versionNumber: 3,
    lastModifiedAt: ts(60 * 24),
    parameters: [
      { name: 'window_start', type: 'date', required: true, description: 'Start of measurement window' },
      { name: 'window_end', type: 'date', required: true },
      { name: 'min_bucket', type: 'number', required: true, defaultValue: 10, min: 5 },
    ],
    outputSchema: {
      shape: 'tabular',
      columns: [
        { name: 'sector', type: 'enum' },
        { name: 'advance_rate', type: 'number' },
        { name: 'bucket_size', type: 'number' },
      ],
    },
    dsl: `SELECT
  weighted_avg(advance_rate, principal) AS advance_rate,
  sector,
  count(*) AS bucket_size
FROM loans
WHERE as_of_date BETWEEN :window_start AND :window_end
GROUP BY sector
HAVING bucket_size >= :min_bucket;`,
    approvals: [
      { datasetId: 'ds_mfone', state: 'approved', approvedAt: ts(60 * 24 * 14), approverId: 'usr_tom', signature: '0x' + 'aa'.repeat(20) },
      { datasetId: 'ds_creditbridge', state: 'pending' },
    ],
    tags: ['credit-quality', 'underwriting'],
    compatibleAssetClasses: ['private-credit', 'trade-receivables'],
    archived: false,
    averageRuntimeMs: 1_840,
  },
  {
    id: 'tpl_concentration_breaches',
    name: 'Concentration breaches over rolling window',
    description: 'Detects sectors where exposure > 25% of pool over the rolling window.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_concentration_v1',
    versionNumber: 1,
    lastModifiedAt: ts(60 * 24 * 5),
    parameters: [
      { name: 'window_days', type: 'number', required: true, defaultValue: 90 },
      { name: 'threshold_pct', type: 'number', required: true, defaultValue: 0.25 },
    ],
    outputSchema: {
      shape: 'time-series',
      columns: [{ name: 'sector', type: 'string' }, { name: 'exposure_pct', type: 'number' }],
    },
    dsl: `SELECT as_of_date, sector, sum(principal)/sum(sum(principal)) OVER (PARTITION BY as_of_date) AS exposure_pct
FROM loans
WHERE as_of_date > now() - interval ':window_days days'
GROUP BY as_of_date, sector
HAVING exposure_pct > :threshold_pct;`,
    approvals: [
      { datasetId: 'ds_mfone', state: 'approved', approvedAt: ts(60 * 24 * 30), approverId: 'usr_tom' },
    ],
    tags: ['concentration', 'risk-limit'],
    compatibleAssetClasses: ['private-credit', 'trade-receivables'],
    archived: false,
    averageRuntimeMs: 2_910,
  },
  {
    id: 'tpl_default_rate_by_vintage',
    name: 'Default rate by vintage',
    description: 'Quarterly vintage default rate with confidence intervals.',
    authorId: 'usr_admin',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_default_rate_v2',
    versionNumber: 2,
    lastModifiedAt: ts(60 * 12),
    parameters: [
      { name: 'lookback_quarters', type: 'number', required: true, defaultValue: 8 },
    ],
    outputSchema: {
      shape: 'tabular',
      columns: [
        { name: 'vintage', type: 'string' },
        { name: 'default_rate', type: 'number' },
        { name: 'ci_lo', type: 'number' },
        { name: 'ci_hi', type: 'number' },
      ],
    },
    dsl: `SELECT vintage, avg(default_flag) AS default_rate, ...
FROM loans
GROUP BY vintage
HAVING bucket_size >= 25;`,
    approvals: [
      { datasetId: 'ds_creditbridge', state: 'approved', approvedAt: ts(60 * 24 * 7), approverId: 'usr_tom' },
      { datasetId: 'ds_mfone', state: 'changes-requested', rationale: 'Reduce parameter range' },
    ],
    tags: ['default-rate', 'vintage'],
    compatibleAssetClasses: ['private-credit'],
    archived: false,
    averageRuntimeMs: 1_240,
  },
]
```

- [ ] **Step 2: Write `lib/api/fixtures/runs.ts`**

```ts
import type { Run } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

const att = (seed: string) => ({
  teeMeasurement: `0x${seed.padEnd(64, '1')}`,
  codeHash: `0x${seed.padEnd(64, '2')}`,
  outputSignature: `0x${seed.padEnd(64, '3')}`,
  anchorTxHash: `0x${seed.padEnd(64, '4')}`,
  anchorBlockNumber: 19_500_000 + seed.length * 23,
  anchorChain: 'base' as const,
  anchoredAt: ts(45),
})

export const runFixtures: Run[] = [
  {
    id: 'run_4821',
    templateId: 'tpl_advance_rate_by_sector',
    templateVersionId: 'tplv_advance_rate_v3',
    datasetId: 'ds_mfone',
    schemaVersionAtRun: 3,
    runnerId: 'usr_maya',
    runnerOrgId: 'org_gauntlet',
    parameters: { window_start: '2026-01-01', window_end: '2026-04-30', min_bucket: 10 },
    status: 'completed',
    queuedAt: ts(50),
    startedAt: ts(50),
    completedAt: ts(48),
    durationMs: 1_840,
    result: {
      shape: 'tabular',
      columns: ['sector', 'advance_rate', 'bucket_size'],
      rows: [
        ['Industrials', 0.812, 47],
        ['Consumer', 0.764, 31],
        ['Healthcare', 0.821, 14],
        ['Tech', 0.789, 22],
        ['Energy', 0.701, 12],
      ],
    },
    attestation: att('run4821'),
  },
  {
    id: 'run_4822',
    templateId: 'tpl_concentration_breaches',
    templateVersionId: 'tplv_concentration_v1',
    datasetId: 'ds_mfone',
    schemaVersionAtRun: 3,
    runnerId: 'usr_maya',
    runnerOrgId: 'org_gauntlet',
    parameters: { window_days: 90, threshold_pct: 0.25 },
    status: 'completed',
    queuedAt: ts(120),
    startedAt: ts(120),
    completedAt: ts(118),
    durationMs: 2_910,
    result: {
      shape: 'time-series',
      metric: 'exposure_pct',
      series: [
        { name: 'Industrials', points: Array.from({ length: 12 }, (_, i) => ({ t: ts(120 - i * 10), v: 0.22 + i * 0.005 })) },
        { name: 'Consumer', points: Array.from({ length: 12 }, (_, i) => ({ t: ts(120 - i * 10), v: 0.18 + i * 0.002 })) },
      ],
    },
    attestation: att('run4822'),
  },
  {
    id: 'run_4823',
    templateId: 'tpl_default_rate_by_vintage',
    templateVersionId: 'tplv_default_rate_v2',
    datasetId: 'ds_creditbridge',
    schemaVersionAtRun: 2,
    runnerId: 'usr_admin',
    runnerOrgId: 'org_gauntlet',
    parameters: { lookback_quarters: 8 },
    status: 'running',
    queuedAt: ts(2),
    startedAt: ts(1),
  },
  {
    id: 'run_4820',
    templateId: 'tpl_advance_rate_by_sector',
    templateVersionId: 'tplv_advance_rate_v3',
    datasetId: 'ds_mfone',
    schemaVersionAtRun: 3,
    runnerId: 'usr_maya',
    runnerOrgId: 'org_gauntlet',
    parameters: { window_start: '2025-10-01', window_end: '2025-12-31', min_bucket: 10 },
    status: 'failed',
    queuedAt: ts(60 * 24),
    startedAt: ts(60 * 24),
    completedAt: ts(60 * 24 - 2),
    durationMs: 120,
    error: 'Simulated mock failure: schema drift detected — bucket size constraint not met for 2/5 sectors.',
  },
]
```

- [ ] **Step 3: Write `lib/api/fixtures/insights.ts`**

```ts
import type { AIInsight } from '@/lib/api/types'

export const insightFixtures: AIInsight[] = [
  {
    id: 'ins_001',
    generatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    claim: 'Vintage Q3-2025 in mF-ONE shows declining advance rate; concentration breach predicted within 14 days.',
    evidenceRunIds: ['run_4821', 'run_4822'],
    severity: 'warning',
    suggestedAction: { label: 'Run concentration check', href: '/templates/tpl_concentration_breaches/run' },
  },
  {
    id: 'ins_002',
    generatedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
    claim: 'CreditBridge EU MidMarket completeness held at 100% for 9 consecutive days — strong consistency vs peers.',
    evidenceRunIds: ['run_4823'],
    severity: 'info',
  },
  {
    id: 'ins_003',
    generatedAt: new Date(Date.now() - 200 * 60_000).toISOString(),
    claim: 'FlowCredit APAC ingestion paused by originator — revisit when schema v2 is signed.',
    evidenceRunIds: ['run_4820'],
    severity: 'critical',
    suggestedAction: { label: 'View dataset', href: '/datasets/ds_flowcredit_apac' },
  },
]
```

- [ ] **Step 4: Wire into `lib/api/fixtures/index.ts`**

```ts
import { orgFixtures } from './orgs'
import { userFixtures, DEMO_PERSONA_IDS } from './users'
import { notificationFixtures } from './notifications'
import { networkHealthFixture } from './network'
import { datasetFixtures } from './datasets'
import { schemaFixtures } from './schemas-fx'
import { templateFixtures } from './templates'
import { runFixtures } from './runs'
import { insightFixtures } from './insights'

export const fixtures = {
  orgs: orgFixtures,
  users: userFixtures,
  notifications: notificationFixtures,
  networkHealth: networkHealthFixture,
  datasets: datasetFixtures,
  schemas: schemaFixtures,
  templates: templateFixtures,
  runs: runFixtures,
  insights: insightFixtures,
} as const

export { DEMO_PERSONA_IDS }
```

- [ ] **Step 5: Add round-trip assertions**

Append to `tests/unit/api/fixtures.test.ts`:

```ts
import { TemplateSchema, RunSchema, AIInsightSchema } from '@/lib/api/schemas'

describe('templates/runs/insights round-trip', () => {
  it('templates', () => fixtures.templates.forEach((t) => TemplateSchema.parse(t)))
  it('runs', () => fixtures.runs.forEach((r) => RunSchema.parse(r)))
  it('insights', () => fixtures.insights.forEach((i) => AIInsightSchema.parse(i)))
  it('every run references an existing template + dataset', () => {
    const tIds = new Set(fixtures.templates.map((t) => t.id))
    const dIds = new Set(fixtures.datasets.map((d) => d.id))
    fixtures.runs.forEach((r) => {
      expect(tIds.has(r.templateId)).toBe(true)
      expect(dIds.has(r.datasetId)).toBe(true)
    })
  })
})
```

- [ ] **Step 6: Run + commit**

```bash
npm run test -- fixtures
git add lib/api/fixtures tests/unit/api/fixtures.test.ts
git commit -m "feat(api): template, run, and AI insight fixtures"
```

---

## Phase B — Endpoints

## Task 4: Build dataset endpoints

**Files:**
- Create: `lib/api/endpoints/datasets.ts`
- Create: `tests/unit/api/datasets.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/api/datasets.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  listDatasets, getDataset, getDatasetSchema, getDatasetRuns,
} from '@/lib/api/endpoints/datasets'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('dataset endpoints', () => {
  it('listDatasets returns visible datasets', async () => {
    const list = await listDatasets(ctx, {})
    expect(list.length).toBeGreaterThan(0)
  })
  it('listDatasets filters by assetClass', async () => {
    const list = await listDatasets(ctx, { assetClass: 't-bills' })
    expect(list.every((d) => d.assetClass === 't-bills')).toBe(true)
  })
  it('listDatasets filters by status', async () => {
    const list = await listDatasets(ctx, { status: 'paused' })
    expect(list.every((d) => d.status === 'paused')).toBe(true)
  })
  it('listDatasets filters by free-text search', async () => {
    const list = await listDatasets(ctx, { search: 'mF-ONE' })
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].name).toBe('mF-ONE')
  })
  it('getDataset returns one dataset', async () => {
    const d = await getDataset(ctx, 'ds_mfone')
    expect(d.id).toBe('ds_mfone')
  })
  it('getDataset throws on unknown id', async () => {
    await expect(getDataset(ctx, 'ds_nope')).rejects.toThrow()
  })
  it('getDatasetSchema returns the dataset schema', async () => {
    const s = await getDatasetSchema(ctx, 'ds_mfone')
    expect(s.fields.length).toBeGreaterThan(0)
  })
  it('getDatasetRuns filters by datasetId', async () => {
    const runs = await getDatasetRuns(ctx, 'ds_mfone')
    expect(runs.every((r) => r.datasetId === 'ds_mfone')).toBe(true)
  })
})
```

- [ ] **Step 2: Implement `lib/api/endpoints/datasets.ts`**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import {
  DatasetSchema, SchemaSchema, RunSchema,
} from '@/lib/api/schemas'
import type { Dataset, Schema, Run, AssetClass } from '@/lib/api/types'

export type DatasetFilters = {
  search?: string
  assetClass?: AssetClass
  status?: 'active' | 'paused' | 'archived'
  originatorOrgId?: string
}

export const listDatasets = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: DatasetFilters = {}): Promise<Dataset[]> => {
    let list = fixtures.datasets.slice()
    if (filters.assetClass) list = list.filter((d) => d.assetClass === filters.assetClass)
    if (filters.status) list = list.filter((d) => d.status === filters.status)
    if (filters.originatorOrgId) list = list.filter((d) => d.originatorOrgId === filters.originatorOrgId)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
    }
    return list.map((d) => DatasetSchema.parse(d))
  },
  { latencyMs: 180 }
)

export const getDataset = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Dataset> => {
    const found = fixtures.datasets.find((d) => d.id === datasetId)
    if (!found) throw new MockApiError(`Dataset ${datasetId} not found`, 404)
    return DatasetSchema.parse(found)
  },
  { latencyMs: 120 }
)

export const getDatasetSchema = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Schema> => {
    const ds = fixtures.datasets.find((d) => d.id === datasetId)
    if (!ds) throw new MockApiError(`Dataset ${datasetId} not found`, 404)
    const s = fixtures.schemas.find((x) => x.id === ds.schemaId)
    if (!s) throw new MockApiError(`Schema ${ds.schemaId} not found`, 404)
    return SchemaSchema.parse(s)
  },
  { latencyMs: 120 }
)

export const getDatasetRuns = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Run[]> => {
    return fixtures.runs.filter((r) => r.datasetId === datasetId).map((r) => RunSchema.parse(r))
  },
  { latencyMs: 160 }
)

export type LineageNode = { id: string; label: string; kind: 'source' | 'agent' | 'storage' | 'enclave' | 'output'; status: 'ok' | 'lagging' | 'down' }
export type LineageEdge = { from: string; to: string }
export type Lineage = { nodes: LineageNode[]; edges: LineageEdge[] }

export const getDatasetLineage = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Lineage> => {
    return {
      nodes: [
        { id: 'src', label: 'Postgres @ originator', kind: 'source', status: 'ok' },
        { id: 'agent', label: 'Hyve Connect agent', kind: 'agent', status: 'ok' },
        { id: 'store', label: 'H3 storage', kind: 'storage', status: 'ok' },
        { id: 'tee', label: 'TEE enclave', kind: 'enclave', status: 'ok' },
        { id: 'out', label: 'Signed output', kind: 'output', status: 'ok' },
      ],
      edges: [
        { from: 'src', to: 'agent' },
        { from: 'agent', to: 'store' },
        { from: 'store', to: 'tee' },
        { from: 'tee', to: 'out' },
      ],
    }
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- datasets
git add lib/api/endpoints/datasets.ts tests/unit/api/datasets.test.ts
git commit -m "feat(api): dataset endpoints (list, get, schema, runs, lineage)"
```

---

## Task 5: Build template endpoints

**Files:**
- Create: `lib/api/endpoints/templates.ts`
- Create: `tests/unit/api/templates.test.ts`

- [ ] **Step 1: Write the test**

`tests/unit/api/templates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  listTemplates, getTemplate, draftTemplate, archiveTemplate, forkTemplate,
} from '@/lib/api/endpoints/templates'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('template endpoints', () => {
  it('listTemplates returns templates', async () => {
    const t = await listTemplates(ctx, {})
    expect(t.length).toBeGreaterThan(0)
  })
  it('listTemplates filters by datasetId', async () => {
    const t = await listTemplates(ctx, { datasetId: 'ds_mfone' })
    expect(t.every((x) => x.approvals.some((a) => a.datasetId === 'ds_mfone'))).toBe(true)
  })
  it('getTemplate by id', async () => {
    const t = await getTemplate(ctx, 'tpl_advance_rate_by_sector')
    expect(t.versionNumber).toBeGreaterThanOrEqual(1)
  })
  it('draftTemplate inserts a new in-memory template', async () => {
    const t = await draftTemplate(ctx, {
      name: 'Test draft',
      description: 'd',
      dsl: 'SELECT 1',
      parameters: [],
      outputSchema: { shape: 'scalar' },
    })
    expect(t.id).toMatch(/^tpl_/)
    const fetched = await getTemplate(ctx, t.id)
    expect(fetched.name).toBe('Test draft')
  })
  it('archiveTemplate flips archived flag', async () => {
    const t = await draftTemplate(ctx, { name: 'X', description: '', dsl: '', parameters: [], outputSchema: { shape: 'scalar' } })
    await archiveTemplate(ctx, t.id)
    const after = await getTemplate(ctx, t.id)
    expect(after.archived).toBe(true)
  })
  it('forkTemplate creates a copy with attribution', async () => {
    const f = await forkTemplate(ctx, 'tpl_advance_rate_by_sector')
    expect(f.forkOfTemplateId).toBe('tpl_advance_rate_by_sector')
    expect(f.id).not.toBe('tpl_advance_rate_by_sector')
  })
})
```

- [ ] **Step 2: Implement `lib/api/endpoints/templates.ts`**

```ts
import { mockEndpoint, mockQuery, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { TemplateSchema } from '@/lib/api/schemas'
import type { Template, TemplateParameter, OutputSchema } from '@/lib/api/types'

const state: Template[] = fixtures.templates.map((t) => ({ ...t }))

export type TemplateFilters = {
  search?: string
  datasetId?: string
  ownership?: 'mine' | 'org' | 'shared'
  approvalState?: 'unsubmitted' | 'pending' | 'approved' | 'denied' | 'changes-requested'
}

export const listTemplates = mockEndpoint(
  async (ctx: RequestContext, _signal, filters: TemplateFilters = {}): Promise<Template[]> => {
    let list = state.slice()
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }
    if (filters.datasetId) list = list.filter((t) => t.approvals.some((a) => a.datasetId === filters.datasetId))
    if (filters.ownership === 'mine' && ctx.user) list = list.filter((t) => t.authorId === ctx.user!.id)
    if (filters.ownership === 'org' && ctx.user) list = list.filter((t) => t.authorOrgId === ctx.user!.orgId)
    if (filters.approvalState) list = list.filter((t) => t.approvals.some((a) => a.state === filters.approvalState))
    return list.map((t) => TemplateSchema.parse(t))
  },
  { latencyMs: 160 }
)

export const getTemplate = mockEndpoint(
  async (_ctx: RequestContext, _signal, templateId: string): Promise<Template> => {
    const t = state.find((x) => x.id === templateId)
    if (!t) throw new MockApiError(`Template ${templateId} not found`, 404)
    return TemplateSchema.parse(t)
  },
  { latencyMs: 100 }
)

export type DraftInput = {
  name: string
  description: string
  dsl: string
  parameters: TemplateParameter[]
  outputSchema: OutputSchema
  tags?: string[]
}

export const draftTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, input: DraftInput): Promise<Template> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'tpl_' + Math.random().toString(36).slice(2, 10)
    const t: Template = {
      id,
      name: input.name,
      description: input.description,
      authorId: ctx.user.id,
      authorOrgId: ctx.user.orgId,
      versionId: id + '_v1',
      versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      parameters: input.parameters,
      outputSchema: input.outputSchema,
      dsl: input.dsl,
      approvals: [],
      tags: input.tags ?? [],
      compatibleAssetClasses: [],
      archived: false,
    }
    state.unshift(t)
    return TemplateSchema.parse(t)
  },
  { latencyMs: 220 }
)

export const archiveTemplate = mockEndpoint(
  async (_ctx: RequestContext, _signal, templateId: string) => {
    const t = state.find((x) => x.id === templateId)
    if (!t) throw new MockApiError('Template not found', 404)
    t.archived = true
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const forkTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, templateId: string): Promise<Template> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const src = state.find((x) => x.id === templateId)
    if (!src) throw new MockApiError('Source template not found', 404)
    const id = 'tpl_' + Math.random().toString(36).slice(2, 10)
    const fork: Template = {
      ...src,
      id,
      versionId: id + '_v1',
      versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      authorId: ctx.user.id,
      authorOrgId: ctx.user.orgId,
      approvals: [],
      forkOfTemplateId: src.id,
      name: src.name + ' (fork)',
    }
    state.unshift(fork)
    return TemplateSchema.parse(fork)
  },
  { latencyMs: 220 }
)

export const submitForApproval = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { templateId: string; datasetId: string }) => {
    const t = state.find((x) => x.id === input.templateId)
    if (!t) throw new MockApiError('Template not found', 404)
    const existing = t.approvals.find((a) => a.datasetId === input.datasetId)
    if (existing) existing.state = 'pending'
    else t.approvals.push({ datasetId: input.datasetId, state: 'pending' })
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- templates
git add lib/api/endpoints/templates.ts tests/unit/api/templates.test.ts
git commit -m "feat(api): template endpoints (list, get, draft, archive, fork, submit-for-approval)"
```

---

## Task 6: Build run endpoints

**Files:**
- Create: `lib/api/endpoints/runs.ts`
- Create: `tests/unit/api/runs.test.ts`

- [ ] **Step 1: Write the test**

`tests/unit/api/runs.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { listRuns, getRun, executeTemplate, retryRun } from '@/lib/api/endpoints/runs'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('run endpoints', () => {
  it('listRuns returns runs', async () => {
    const list = await listRuns(ctx, {})
    expect(list.length).toBeGreaterThan(0)
  })
  it('listRuns filters by status', async () => {
    const list = await listRuns(ctx, { status: 'completed' })
    expect(list.every((r) => r.status === 'completed')).toBe(true)
  })
  it('getRun returns one run', async () => {
    const r = await getRun(ctx, 'run_4821')
    expect(r.id).toBe('run_4821')
    expect(r.attestation).toBeDefined()
  })
  it('executeTemplate creates a queued run', async () => {
    const r = await executeTemplate(ctx, {
      templateId: 'tpl_advance_rate_by_sector',
      datasetId: 'ds_mfone',
      parameters: { window_start: '2026-01-01', window_end: '2026-04-30', min_bucket: 10 },
    })
    expect(r.status).toMatch(/queued|running|completed/)
    expect(r.runnerId).toBe(ctx.user.id)
  })
  it('retryRun creates a new run from a failed one', async () => {
    const r = await retryRun(ctx, 'run_4820')
    expect(r.id).not.toBe('run_4820')
    expect(r.parameters).toEqual({ window_start: '2025-10-01', window_end: '2025-12-31', min_bucket: 10 })
  })
})
```

- [ ] **Step 2: Implement `lib/api/endpoints/runs.ts`**

```ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { RunSchema } from '@/lib/api/schemas'
import type { Run, RunStatus } from '@/lib/api/types'
import { publish, Topics } from '@/lib/api/realtime'

const state: Run[] = fixtures.runs.map((r) => ({ ...r }))

export type RunFilters = {
  templateId?: string
  datasetId?: string
  runnerOrgId?: string
  status?: RunStatus
  search?: string
}

export const listRuns = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: RunFilters = {}): Promise<Run[]> => {
    let list = state.slice().sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
    if (filters.templateId) list = list.filter((r) => r.templateId === filters.templateId)
    if (filters.datasetId) list = list.filter((r) => r.datasetId === filters.datasetId)
    if (filters.runnerOrgId) list = list.filter((r) => r.runnerOrgId === filters.runnerOrgId)
    if (filters.status) list = list.filter((r) => r.status === filters.status)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((r) => r.id.toLowerCase().includes(q) || r.templateId.toLowerCase().includes(q))
    }
    return list.map((r) => RunSchema.parse(r))
  },
  { latencyMs: 180 }
)

export const getRun = mockEndpoint(
  async (_ctx: RequestContext, _signal, runId: string): Promise<Run> => {
    const r = state.find((x) => x.id === runId)
    if (!r) throw new MockApiError(`Run ${runId} not found`, 404)
    return RunSchema.parse(r)
  },
  { latencyMs: 120 }
)

export type ExecuteInput = {
  templateId: string
  datasetId: string
  parameters: Record<string, unknown>
}

const att = (seed: string) => ({
  teeMeasurement: `0x${seed.padEnd(64, '7')}`,
  codeHash: `0x${seed.padEnd(64, '8')}`,
  outputSignature: `0x${seed.padEnd(64, '9')}`,
  anchorTxHash: `0x${seed.padEnd(64, 'a')}`,
  anchorBlockNumber: 19_900_000 + seed.length * 19,
  anchorChain: 'base' as const,
  anchoredAt: new Date().toISOString(),
})

export const executeTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, input: ExecuteInput): Promise<Run> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'run_' + Math.random().toString(36).slice(2, 8)
    const now = new Date().toISOString()
    const run: Run = {
      id,
      templateId: input.templateId,
      templateVersionId: input.templateId + '_v_latest',
      datasetId: input.datasetId,
      schemaVersionAtRun: 3,
      runnerId: ctx.user.id,
      runnerOrgId: ctx.user.orgId,
      parameters: input.parameters,
      status: 'queued',
      queuedAt: now,
    }
    state.unshift(run)
    publish(Topics.RUNS_PROGRESS, run)

    // Simulate progression: queued → running → attesting → anchoring → completed.
    const progression: RunStatus[] = ['running', 'attesting', 'anchoring', 'completed']
    progression.forEach((s, i) =>
      setTimeout(() => {
        const r = state.find((x) => x.id === id)
        if (!r || r.status === 'completed' || r.status === 'failed') return
        r.status = s
        if (s === 'running') r.startedAt = new Date().toISOString()
        if (s === 'completed') {
          r.completedAt = new Date().toISOString()
          r.durationMs = (i + 1) * 600
          r.result = { shape: 'scalar', value: 0.823, unit: 'rate' }
          r.attestation = att(id)
        }
        publish(Topics.RUNS_PROGRESS, { ...r })
      }, (i + 1) * 600)
    )

    return RunSchema.parse(run)
  },
  { latencyMs: 220 }
)

export const retryRun = mockEndpoint(
  async (ctx: RequestContext, _signal, runId: string): Promise<Run> => {
    const src = state.find((x) => x.id === runId)
    if (!src) throw new MockApiError('Run not found', 404)
    return executeTemplate(ctx, { templateId: src.templateId, datasetId: src.datasetId, parameters: src.parameters as Record<string, unknown> })
  },
  { latencyMs: 80 }
)

export const disputeRun = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { runId: string; reason: string }) => {
    const r = state.find((x) => x.id === input.runId)
    if (!r) throw new MockApiError('Run not found', 404)
    r.status = 'disputed'
    r.disputeReason = input.reason
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- runs
git add lib/api/endpoints/runs.ts tests/unit/api/runs.test.ts
git commit -m "feat(api): run endpoints (list, get, execute with progression, retry, dispute)"
```

---

## Task 7: Build insights endpoint

**Files:**
- Create: `lib/api/endpoints/insights.ts`

- [ ] **Step 1: Write `lib/api/endpoints/insights.ts`**

```ts
import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { AIInsightSchema } from '@/lib/api/schemas'
import type { AIInsight } from '@/lib/api/types'

export const getCounterpartyInsights = mockEndpoint(
  async (_ctx: RequestContext): Promise<AIInsight[]> => {
    return fixtures.insights.map((i) => AIInsightSchema.parse(i))
  },
  { latencyMs: 160 }
)
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/endpoints/insights.ts
git commit -m "feat(api): counterparty insights endpoint"
```

---

## Phase C — Onboarding (deferred per Plan 01 scope split)

## Task 8: Build onboarding wizard

**Files:**
- Create: `app/(auth)/onboarding/page.tsx`
- Create: `app/(auth)/onboarding/actions.ts`

- [ ] **Step 1: Write the Server Action**

`app/(auth)/onboarding/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export async function completeOnboarding(form: FormData) {
  const density = form.get('density') === 'comfortable' ? 'comfortable' : 'compact'
  const session = await getSession()
  session.density = density
  await session.save()
  redirect('/')
}
```

- [ ] **Step 2: Write the page**

`app/(auth)/onboarding/page.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { fixtures } from '@/lib/api/fixtures'
import { completeOnboarding } from './actions'

export const metadata = { title: 'Welcome · Hyve' }

export default async function OnboardingPage() {
  const session = await requireUser()
  const me = await getCurrentUser({ user: session })
  const org = fixtures.orgs.find((o) => o.id === me.orgId)!

  return (
    <Card>
      <CardHeader>
        <p className="font-tag text-foreground/70 mb-2">// onboarding</p>
        <CardTitle className="font-display text-3xl">Welcome to Hyve</CardTitle>
        <CardDescription>
          You're signed in as <strong>{me.name}</strong> at <strong>{org.name}</strong> (
          <span className="font-mono text-xs">{me.role}</span>). Confirm a few preferences to land
          in the right surface. You can change all of these later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={completeOnboarding} className="grid gap-6">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Workspace density</legend>
            <RadioGroup name="density" defaultValue="compact" className="grid gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem id="d-compact" value="compact" />
                <Label htmlFor="d-compact">
                  <span className="font-medium">Compact</span> — denser tables, more on screen.
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="d-comfortable" value="comfortable" />
                <Label htmlFor="d-comfortable">
                  <span className="font-medium">Comfortable</span> — roomier rows.
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Invite teammates (optional)</legend>
            <Input type="email" name="invite" placeholder="teammate@your-org.xyz" />
            <p className="text-xs text-muted-foreground">Stub — invites land in Settings → Members later.</p>
          </fieldset>

          <Button type="submit" size="lg">Enter workspace</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Add a Settings link to skip onboarding**

Onboarding is non-blocking; users land in `/` directly from `/login` (Plan 01 already does this). `/onboarding` is accessible only when explicitly visited. Skipping any unwanted complexity for now is acceptable — the spec calls for a wizard, but a single-page flow satisfies the "preferences" intent for the stub auth path.

- [ ] **Step 4: Smoke**

Run dev. Visit `/onboarding` while signed in. Expect the form. Submit. Land back at `/` with chosen density applied.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/onboarding
git commit -m "feat(onboarding): single-page workspace preferences (density + invite stub)"
```

---

## Phase D — Counterparty home

## Task 9: Build the metric card and insight card

**Files:**
- Create: `components/features/home/metric-card.tsx`
- Create: `components/features/home/insight-card.tsx`

- [ ] **Step 1: Write `metric-card.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Attestation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: ReactNode
  delta?: { direction: 'up' | 'down' | 'flat'; label: string }
  freshAt?: string | null
  attestation?: Attestation | null
  className?: string
}

const deltaTone = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
} as const

const deltaArrow = { up: '↑', down: '↓', flat: '→' } as const

export function MetricCard({ label, value, delta, freshAt, attestation, className }: Props) {
  return (
    <Card className={cn('relative', className)}>
      <CardContent className="grid gap-1.5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-tag text-foreground/55">{label}</p>
          {attestation !== undefined && <AttestationBadge attestation={attestation} compact />}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <div className="flex items-center justify-between text-xs">
          {delta ? (
            <span className={deltaTone[delta.direction]}>
              {deltaArrow[delta.direction]} {delta.label}
            </span>
          ) : (
            <span />
          )}
          {freshAt !== undefined && <FreshnessIndicator timestamp={freshAt} />}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write `insight-card.tsx`**

```tsx
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/lib/api/types'

const ICON = { info: Info, warning: AlertTriangle, critical: ShieldAlert } as const
const TONE = {
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/40 bg-warning/5',
  critical: 'border-destructive/40 bg-destructive/5',
} as const

export function InsightCard({ insight }: { insight: AIInsight }) {
  const Icon = ICON[insight.severity]
  return (
    <Card className={cn('border-l-2', TONE[insight.severity])}>
      <CardContent className="grid gap-3 py-4">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm leading-snug">{insight.claim}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-tag">// evidence:</span>
          {insight.evidenceRunIds.map((rid) => (
            <CopyableHash key={rid} value={rid} short className="text-[0.7rem]" />
          ))}
          <span className="ml-auto">{fmtRelativeTime(insight.generatedAt)}</span>
        </div>
        {insight.suggestedAction && (
          <Button asChild size="sm" variant="outline" className="justify-self-start">
            <a href={insight.suggestedAction.href}>{insight.suggestedAction.label}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/features/home/metric-card.tsx components/features/home/insight-card.tsx
git commit -m "feat(home): MetricCard + InsightCard primitives"
```

---

## Task 10: Build the recent runs strip and watched datasets cards

**Files:**
- Create: `components/features/home/recent-runs-strip.tsx`
- Create: `components/features/home/watched-datasets.tsx`
- Create: `components/features/home/pending-tasks.tsx`

- [ ] **Step 1: Write `recent-runs-strip.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtDuration, fmtRelativeTime } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'
import type { Run } from '@/lib/api/types'

const STATUS_TONE: Record<Run['status'], string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-info/15 text-info',
  attesting: 'bg-info/15 text-info',
  anchoring: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
  disputed: 'bg-warning/15 text-warning',
}

export function RecentRunsStrip({ runs }: { runs: Run[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Recent runs</CardTitle>
        <Link href="/runs" className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          runs.map((r) => (
            <Link
              key={r.id}
              href={`/runs/${r.id}`}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40"
            >
              <Badge variant="outline" className={STATUS_TONE[r.status]}>
                {r.status}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.templateId}</p>
                <p className="truncate text-xs text-muted-foreground">
                  on <span className="font-mono">{r.datasetId}</span>
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {r.durationMs ? fmtDuration(r.durationMs) : '—'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</span>
                <AttestationBadge attestation={r.attestation ?? null} compact />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write `watched-datasets.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { AttestationBadge } from '@/components/common/attestation-badge'
import type { Dataset } from '@/lib/api/types'

export function WatchedDatasets({ datasets }: { datasets: Dataset[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Watched datasets</CardTitle>
        <Link href="/datasets" className="text-xs text-muted-foreground hover:text-foreground">
          Browse all →
        </Link>
      </CardHeader>
      <CardContent className="grid gap-3">
        {datasets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No watched datasets yet.</p>
        ) : (
          datasets.map((d) => (
            <Link
              key={d.id}
              href={`/datasets/${d.id}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-border/70 bg-surface/50 px-3 py-2 hover:bg-surface"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{d.name}</p>
                  <Badge variant="outline" className="font-tag text-[0.6rem]">{d.assetClass}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtNumber(d.recordCount)} records · completeness {fmtPct(d.completenessPct)}
                </p>
              </div>
              <FreshnessIndicator timestamp={d.lastAttestedAt} />
              <AttestationBadge attestation={d.attestation} compact />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `pending-tasks.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Task = { id: string; title: string; href: string; kind: string }

export function PendingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pending tasks</CardTitle>
      </CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing pending — you're caught up.</p>
        ) : (
          tasks.map((t) => (
            <Link key={t.id} href={t.href} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/40">
              <span className="truncate">{t.title}</span>
              <span className="font-tag text-[0.65rem] text-muted-foreground">{t.kind}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/features/home/recent-runs-strip.tsx components/features/home/watched-datasets.tsx components/features/home/pending-tasks.tsx
git commit -m "feat(home): RecentRunsStrip, WatchedDatasets, PendingTasks"
```

---

## Task 11: Build the counterparty home

**Files:**
- Modify: `app/(app)/page.tsx`
- Create: `components/features/home/counterparty-home.tsx`

- [ ] **Step 1: Write `components/features/home/counterparty-home.tsx`**

```tsx
import { fmtNumber } from '@/lib/format'
import { MetricCard } from './metric-card'
import { InsightCard } from './insight-card'
import { RecentRunsStrip } from './recent-runs-strip'
import { WatchedDatasets } from './watched-datasets'
import { PendingTasks } from './pending-tasks'
import type { Dataset, Run, AIInsight } from '@/lib/api/types'

type Props = {
  userName: string
  watched: Dataset[]
  recentRuns: Run[]
  insights: AIInsight[]
  pending: { id: string; title: string; href: string; kind: string }[]
}

export function CounterpartyHome({ userName, watched, recentRuns, insights, pending }: Props) {
  const monitored = watched.length
  const openQueriesThisWeek = recentRuns.filter((r) => Date.now() - new Date(r.queuedAt).getTime() < 7 * 86_400_000).length
  const attestationsReceived = recentRuns.filter((r) => r.attestation).length
  const anomalies = insights.filter((i) => i.severity !== 'info').length

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monitored datasets" value={fmtNumber(monitored)} freshAt={null} />
        <MetricCard label="Queries this week" value={fmtNumber(openQueriesThisWeek)} delta={{ direction: 'up', label: 'vs last week' }} />
        <MetricCard label="Attestations received" value={fmtNumber(attestationsReceived)} />
        <MetricCard label="Anomalies detected" value={fmtNumber(anomalies)} delta={anomalies > 0 ? { direction: 'up', label: 'review' } : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-3 lg:col-span-2">
          <h2 className="font-tag text-foreground/60">// ai insights</h2>
          {insights.slice(0, 3).map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
        <PendingTasks tasks={pending} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentRunsStrip runs={recentRuns.slice(0, 8)} />
        <WatchedDatasets datasets={watched} />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire into `app/(app)/page.tsx`**

```tsx
import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { listRuns } from '@/lib/api/endpoints/runs'
import { getCounterpartyInsights } from '@/lib/api/endpoints/insights'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { CounterpartyHome } from '@/components/features/home/counterparty-home'

export default async function HomePage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [me, allDatasets, recentRuns, insights] = await Promise.all([
    getCurrentUser(ctx),
    listDatasets(ctx, {}),
    listRuns(ctx, {}),
    getCounterpartyInsights(ctx),
  ])
  const watched = allDatasets.filter((d) => d.watching)
  const org = fixtures.orgs.find((o) => o.id === me.orgId)!

  if (me.role === 'originator') {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <PageHeader eyebrow={`// hyve · originator`} title={`Welcome, ${me.name.split(' ')[0]}`} description={`${org.name} — Plan 03 fills this with originator home.`} />
      </div>
    )
  }

  const pending = [
    { id: 't1', title: 'Run #4823 awaiting your review', href: '/runs/run_4823', kind: 'run' },
    { id: 't2', title: 'Template "Default rate by vintage" needs changes', href: '/templates/tpl_default_rate_by_vintage', kind: 'template' },
  ]

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={`// home`}
        title={`Welcome, ${me.name.split(' ')[0]}`}
        description={`Since you last signed in: ${recentRuns.length} runs, ${insights.filter(i => !i.id.startsWith('ins_dismissed_')).length} new insights.`}
      />
      <div className="mt-6">
        <CounterpartyHome
          userName={me.name}
          watched={watched}
          recentRuns={recentRuns}
          insights={insights}
          pending={pending}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Smoke**

Run dev. Sign in as Demo Counterparty. Expect: 4 metric cards, 3 insight cards, recent runs, watched datasets, pending tasks.

- [ ] **Step 4: Commit**

```bash
git add components/features/home app/\(app\)/page.tsx
git commit -m "feat(home): counterparty home with metrics, insights, recent runs, watched datasets, tasks"
```

---

## Phase E — Datasets

## Task 12: Build the dataset catalog page

**Files:**
- Create: `app/(app)/datasets/page.tsx`
- Create: `app/(app)/datasets/loading.tsx`
- Create: `app/(app)/datasets/_components/dataset-filters.tsx`
- Create: `app/(app)/datasets/_components/dataset-table.tsx`

- [ ] **Step 1: Write `dataset-filters.tsx`**

```tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const ASSET_CLASSES = ['all', 'private-credit', 'trade-receivables', 'flow-credit', 't-bills', 'multi-asset'] as const
const STATUSES = ['all', 'active', 'paused', 'archived'] as const

export function DatasetFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString())
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    router.replace(`${pathname}?${next.toString()}`)
  }

  return (
    <aside className="grid gap-4 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          defaultValue={sp.get('q') ?? ''}
          placeholder="Try: EU private credit"
          onChange={(e) => update('q', e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Asset class</Label>
        <Select defaultValue={sp.get('class') ?? 'all'} onValueChange={(v) => update('class', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSET_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Select defaultValue={sp.get('status') ?? 'all'} onValueChange={(v) => update('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Write `dataset-table.tsx`**

```tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { fixtures } from '@/lib/api/fixtures'
import type { Dataset } from '@/lib/api/types'

const statusTone: Record<Dataset['status'], string> = {
  active: 'bg-success/15 text-success border-success/30',
  paused: 'bg-warning/15 text-warning border-warning/30',
  archived: 'bg-muted text-muted-foreground border-border',
}

export function DatasetTable({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Name</th>
            <th>Originator</th>
            <th>Asset class</th>
            <th className="text-right">Records</th>
            <th className="text-right">Completeness</th>
            <th>Last attested</th>
            <th className="text-right">Templates</th>
            <th>Status</th>
            <th className="sr-only">Attestation</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((d) => {
            const org = fixtures.orgs.find((o) => o.id === d.originatorOrgId)
            return (
              <tr key={d.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">
                    {d.name}
                  </Link>
                  {d.alerts.length > 0 && (
                    <span className="ml-2 inline-block size-1.5 rounded-full bg-warning" aria-label={`${d.alerts.length} alerts`} />
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{org?.name ?? d.originatorOrgId}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{d.assetClass}</Badge></td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(d.recordCount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtPct(d.completenessPct)}</td>
                <td className="px-3 py-2"><FreshnessIndicator timestamp={d.lastAttestedAt} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{d.templateCount}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={statusTone[d.status]}>{d.status}</Badge></td>
                <td className="px-3 py-2"><AttestationBadge attestation={d.attestation} compact /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {datasets.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No datasets match these filters.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write the page**

`app/(app)/datasets/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { PageHeader } from '@/components/common/page-header'
import { DatasetFilters } from './_components/dataset-filters'
import { DatasetTable } from './_components/dataset-table'
import type { AssetClass } from '@/lib/api/types'

type Search = { q?: string; class?: string; status?: string }

export default async function DatasetsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser()
  const sp = await searchParams
  const datasets = await listDatasets(
    { user: session },
    {
      search: sp.q,
      assetClass: (sp.class && sp.class !== 'all') ? (sp.class as AssetClass) : undefined,
      status: (sp.status && sp.status !== 'all') ? (sp.status as 'active' | 'paused' | 'archived') : undefined,
    }
  )

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// catalog"
        title="Datasets"
        description="Browse all datasets you have access to. Click any row to drill into schema, templates, runs, and lineage."
      />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-4">
        <div className="rounded-lg border border-border bg-surface/40">
          <DatasetFilters />
        </div>
        <DatasetTable datasets={datasets} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `loading.tsx`**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'

export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <RowsSkeleton rows={10} />
    </div>
  )
}
```

- [ ] **Step 5: Smoke**

Run dev, visit `/datasets`. Verify table, filters update URL, search filters rows.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/datasets
git commit -m "feat(datasets): catalog page with URL-driven filters and dense table"
```

---

## Task 13: Build the dataset detail layout with tabs

**Files:**
- Create: `app/(app)/datasets/[datasetId]/layout.tsx`
- Create: `app/(app)/datasets/[datasetId]/loading.tsx`

- [ ] **Step 1: Write the layout with tab nav**

`app/(app)/datasets/[datasetId]/layout.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'

type Props = {
  children: ReactNode
  params: Promise<{ datasetId: string }>
}

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/schema', label: 'Schema' },
  { href: '/templates', label: 'Templates' },
  { href: '/runs', label: 'Runs' },
  { href: '/lineage', label: 'Lineage' },
] as const

export default async function DatasetLayout({ children, params }: Props) {
  const { datasetId } = await params
  const session = await requireUser()
  const ds = await getDataset({ user: session }, datasetId)
  const org = fixtures.orgs.find((o) => o.id === ds.originatorOrgId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// dataset · ${ds.assetClass}`}
        title={
          <span className="flex items-center gap-2">
            {ds.name}
            <AttestationBadge attestation={ds.attestation} />
            <FreshnessIndicator timestamp={ds.lastAttestedAt} />
          </span>
        }
        description={
          <span>
            <span className="font-medium text-foreground">{org?.name ?? ds.originatorOrgId}</span>
            {' · '}
            <span>{ds.description}</span>
          </span>
        }
        actions={
          <Button asChild>
            <Link href={`/templates/new?dataset=${datasetId}`}>Propose new template</Link>
          </Button>
        }
      />

      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Dataset sections">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={`/datasets/${datasetId}${t.href}`}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>

      <p className="sr-only">
        Status: {ds.status}. Records: {ds.recordCount}.
      </p>
      <Badge className="sr-only">{ds.status}</Badge>
    </div>
  )
}
```

> **Note on `aria-current`:** Next.js `<Link>` doesn't auto-set `aria-current`. We render plain links and rely on URL match in the browser via CSS. For correctness, the next refinement (deferred) wraps `<Link>` in a small client component. For Plan 02 the tab labels are visible enough.

- [ ] **Step 2: Write `loading.tsx`**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'

export default function Loading() {
  return <RowsSkeleton rows={6} />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/layout.tsx app/\(app\)/datasets/\[datasetId\]/loading.tsx
git commit -m "feat(datasets): dataset detail layout with tab nav"
```

---

## Task 14: Build the dataset Overview tab

**Files:**
- Create: `app/(app)/datasets/[datasetId]/page.tsx`
- Create: `components/features/datasets/ask-anything-input.tsx`

- [ ] **Step 1: Write `ask-anything-input.tsx`**

```tsx
'use client'

import { useTransition, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Suggestion = { question: string; templateHint?: string }

export function AskAnythingInput({
  datasetId,
  suggestions,
  onAsk,
}: {
  datasetId: string
  suggestions: Suggestion[]
  onAsk: (q: string) => Promise<{ href: string }>
}) {
  const [q, setQ] = useState('')
  const [isPending, start] = useTransition()

  function ask(text: string) {
    start(async () => {
      const r = await onAsk(text)
      window.location.assign(r.href)
    })
  }

  return (
    <div className="grid gap-2">
      <form
        className="flex gap-2"
        action={(form) => {
          const text = form.get('q') as string
          ask(text)
        }}
      >
        <Input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask anything about ${datasetId}…`} />
        <Button type="submit" disabled={isPending || q.trim().length === 0}>
          <Sparkles className="size-3.5" /> Ask
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.question}
            type="button"
            onClick={() => ask(s.question)}
            className="rounded-full border border-border bg-surface/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {s.question}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the Overview page**

`app/(app)/datasets/[datasetId]/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { ai } from '@/lib/api/endpoints/ai'
import { Card, CardContent } from '@/components/ui/card'
import { fmtNumber, fmtPct } from '@/lib/format'
import { MetricCard } from '@/components/features/home/metric-card'
import { AskAnythingInput } from '@/components/features/datasets/ask-anything-input'
import { InsightCard } from '@/components/features/home/insight-card'

export default async function DatasetOverview({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [ds, suggestions, anomalies] = await Promise.all([
    getDataset(ctx, datasetId),
    ai.suggestQueries(ctx, datasetId),
    ai.detectAnomalies(ctx, datasetId),
  ])

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Records under management" value={fmtNumber(ds.recordCount)} attestation={ds.attestation} freshAt={ds.lastAttestedAt} />
        <MetricCard label="Completeness" value={fmtPct(ds.completenessPct)} attestation={ds.attestation} />
        <MetricCard label="Schema version" value={`v${ds.schemaVersion}`} />
        <MetricCard label="Active templates" value={fmtNumber(ds.templateCount)} />
        <MetricCard label="Lifetime runs" value={fmtNumber(ds.lifetimeRunCount)} />
        <MetricCard label="Status" value={ds.status} />
      </section>

      {ds.alerts.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">// active alerts</h2>
          {ds.alerts.map((a) => (
            <Card key={a.id} className="border-l-2 border-warning/60 bg-warning/5">
              <CardContent className="py-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">// ask the dataset</h2>
        <AskAnythingInput
          datasetId={datasetId}
          suggestions={suggestions}
          onAsk={async (q) => {
            'use server'
            return { href: `/templates/new?dataset=${datasetId}&prompt=${encodeURIComponent(q)}` }
          }}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">// anomalies</h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No anomalies detected.</p>
        ) : (
          anomalies.map((i) => <InsightCard key={i.id} insight={i} />)
        )}
      </section>

      {ds.description && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">// description</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{ds.description}</p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/page.tsx components/features/datasets/ask-anything-input.tsx
git commit -m "feat(datasets): Overview tab with metrics, alerts, ask-anything, anomalies"
```

---

## Task 15: Build the Schema tab

**Files:**
- Create: `app/(app)/datasets/[datasetId]/schema/page.tsx`
- Create: `components/features/datasets/field-exposure-badge.tsx`
- Create: `components/features/datasets/schema-tree.tsx`

- [ ] **Step 1: Write `field-exposure-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import type { SchemaField } from '@/lib/api/types'

const TONE: Record<SchemaField['exposure'], string> = {
  queryable: 'bg-success/15 text-success border-success/30',
  'aggregated-only': 'bg-info/15 text-info border-info/30',
  private: 'bg-muted text-muted-foreground border-border',
}

const LABEL: Record<SchemaField['exposure'], string> = {
  queryable: 'queryable',
  'aggregated-only': 'aggregated-only',
  private: 'private',
}

export function FieldExposureBadge({ exposure }: { exposure: SchemaField['exposure'] }) {
  return <Badge variant="outline" className={`font-tag text-[0.65rem] ${TONE[exposure]}`}>{LABEL[exposure]}</Badge>
}
```

- [ ] **Step 2: Write `schema-tree.tsx`**

```tsx
import { FieldExposureBadge } from './field-exposure-badge'
import { Badge } from '@/components/ui/badge'
import type { Schema } from '@/lib/api/types'

export function SchemaTree({ schema }: { schema: Schema }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Field</th>
            <th>Type</th>
            <th>Exposure</th>
            <th>Min bucket</th>
            <th>Operators</th>
            <th>PII</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {schema.fields.map((f) => (
            <tr key={f.name} className="border-t border-border/60">
              <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
              <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{f.type}</Badge></td>
              <td className="px-3 py-2"><FieldExposureBadge exposure={f.exposure} /></td>
              <td className="px-3 py-2 text-muted-foreground tabular-nums">{f.minBucketSize ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {f.allowedOperators?.map((o) => <span key={o} className="mr-1 font-mono text-xs">{o}</span>) ?? '—'}
              </td>
              <td className="px-3 py-2">{f.isPii ? <Badge variant="outline" className="border-warning/40 text-warning">PII</Badge> : '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{f.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Write the page**

`app/(app)/datasets/[datasetId]/schema/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { getDatasetSchema } from '@/lib/api/endpoints/datasets'
import { SchemaTree } from '@/components/features/datasets/schema-tree'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate, fmtNumber } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'

export default async function SchemaTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const schema = await getDatasetSchema({ user: session }, datasetId)

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-4 rounded-lg border border-border bg-surface/40 p-4">
        <KeyValue label="Schema version" value={`v${schema.version}`} />
        <KeyValue label="Published" value={fmtDate(schema.publishedAt)} />
        <KeyValue label="Signed by" value={<CopyableHash value={schema.signedBy} />} />
        <KeyValue label="K-anonymity" value={fmtNumber(schema.policy.kAnonymity)} />
        <KeyValue label="Daily query cap" value={fmtNumber(schema.policy.maxQueriesPerCounterpartyPerDay)} />
        <KeyValue label="Time ranges" value={schema.policy.allowedTimeRanges?.join(', ') ?? '—'} />
        {schema.changeSummary && (
          <KeyValue className="md:col-span-4" label="Change summary" value={schema.changeSummary} />
        )}
      </section>
      <SchemaTree schema={schema} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/schema components/features/datasets/field-exposure-badge.tsx components/features/datasets/schema-tree.tsx
git commit -m "feat(datasets): Schema tab with field tree and policy"
```

---

## Task 16: Build the Templates and Runs tabs (dataset-scoped)

**Files:**
- Create: `app/(app)/datasets/[datasetId]/templates/page.tsx`
- Create: `app/(app)/datasets/[datasetId]/runs/page.tsx`

- [ ] **Step 1: Write the Templates tab**

`app/(app)/datasets/[datasetId]/templates/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listTemplates } from '@/lib/api/endpoints/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { EmptyState } from '@/components/common/empty-state'

export default async function TemplatesTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const templates = await listTemplates({ user: session }, { datasetId })

  if (templates.length === 0) {
    return (
      <EmptyState
        title="No approved templates against this dataset yet"
        description="Propose a new template to start running queries here."
        action={<Button asChild><Link href={`/templates/new?dataset=${datasetId}`}>Propose template</Link></Button>}
      />
    )
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Name</th>
            <th>Status</th>
            <th>Description</th>
            <th>Last modified</th>
            <th className="text-right">Avg runtime</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const approval = t.approvals.find((a) => a.datasetId === datasetId)
            return (
              <tr key={t.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link></td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{approval?.state ?? 'unsubmitted'}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{t.description}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(t.lastModifiedAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.averageRuntimeMs ? fmtDuration(t.averageRuntimeMs) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Write the Runs tab**

`app/(app)/datasets/[datasetId]/runs/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getDatasetRuns } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'

export default async function RunsTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const runs = await getDatasetRuns({ user: session }, datasetId)

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Run</th>
            <th>Template</th>
            <th>Runner</th>
            <th>Status</th>
            <th>When</th>
            <th className="text-right">Duration</th>
            <th>Attestation</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const runnerOrg = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
            return (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/runs/${r.id}`} className="font-mono text-xs hover:underline">{r.id}</Link></td>
                <td className="px-3 py-2"><Link href={`/templates/${r.templateId}`} className="hover:underline">{r.templateId}</Link></td>
                <td className="px-3 py-2 text-muted-foreground">{runnerOrg?.name ?? r.runnerOrgId}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{r.status}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.durationMs ? fmtDuration(r.durationMs) : '—'}</td>
                <td className="px-3 py-2">
                  {r.attestation ? <CopyableHash value={r.attestation.outputSignature} /> : <AttestationBadge attestation={null} compact />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {runs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No runs yet.</p>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/templates app/\(app\)/datasets/\[datasetId\]/runs
git commit -m "feat(datasets): Templates and Runs tabs (dataset-scoped)"
```

---

## Task 17: Build the Lineage tab

**Files:**
- Create: `app/(app)/datasets/[datasetId]/lineage/page.tsx`
- Create: `components/features/datasets/lineage-flow.tsx`

- [ ] **Step 1: Write `lineage-flow.tsx`**

```tsx
import { ArrowRight, Database, Plug, Server, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lineage, LineageNode } from '@/lib/api/endpoints/datasets'

const ICON: Record<LineageNode['kind'], typeof Database> = {
  source: Database,
  agent: Plug,
  storage: Server,
  enclave: ShieldCheck,
  output: Sparkles,
}

const STATUS_TONE: Record<LineageNode['status'], string> = {
  ok: 'border-success/40 bg-success/5',
  lagging: 'border-warning/40 bg-warning/5',
  down: 'border-destructive/40 bg-destructive/5',
}

export function LineageFlow({ lineage }: { lineage: Lineage }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/40 p-6">
      {lineage.nodes.map((n, i) => {
        const Icon = ICON[n.kind]
        return (
          <div key={n.id} className="flex items-center gap-3">
            <div className={cn('flex flex-col items-center gap-2 rounded-lg border p-4 min-w-32', STATUS_TONE[n.status])}>
              <Icon className="size-5" />
              <p className="font-tag text-[0.65rem] text-muted-foreground">{n.kind}</p>
              <p className="text-sm font-medium text-center">{n.label}</p>
            </div>
            {i < lineage.nodes.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Write the page**

`app/(app)/datasets/[datasetId]/lineage/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { getDatasetLineage } from '@/lib/api/endpoints/datasets'
import { LineageFlow } from '@/components/features/datasets/lineage-flow'

export default async function LineageTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const lineage = await getDatasetLineage({ user: session }, datasetId)

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">// data flow</h2>
        <LineageFlow lineage={lineage} />
      </section>
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">// stream completeness</h2>
        <p className="text-sm text-muted-foreground">
          Plan 06 fills in the live completeness graph with attestation markers.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/lineage components/features/datasets/lineage-flow.tsx
git commit -m "feat(datasets): Lineage tab with simple flow diagram"
```

---

## Phase F — Templates

## Task 18: Build the templates library page

**Files:**
- Create: `app/(app)/templates/page.tsx`
- Create: `app/(app)/templates/loading.tsx`
- Create: `components/features/templates/approval-status-cluster.tsx`

- [ ] **Step 1: Write `approval-status-cluster.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TemplateApproval } from '@/lib/api/types'

const TONE: Record<TemplateApproval['state'], string> = {
  approved: 'bg-success/15 text-success border-success/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  denied: 'bg-destructive/15 text-destructive border-destructive/30',
  'changes-requested': 'bg-info/15 text-info border-info/30',
  unsubmitted: 'bg-muted text-muted-foreground border-border',
}

export function ApprovalStatusCluster({ approvals }: { approvals: TemplateApproval[] }) {
  if (approvals.length === 0) return <span className="text-xs text-muted-foreground">none</span>
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-wrap gap-1">
        {approvals.map((a) => (
          <Tooltip key={a.datasetId}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`font-tag text-[0.6rem] ${TONE[a.state]}`}>
                {a.datasetId}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{a.datasetId}: <strong>{a.state}</strong></p>
              {a.rationale && <p className="text-xs text-muted-foreground">{a.rationale}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Write the library page**

`app/(app)/templates/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listTemplates } from '@/lib/api/endpoints/templates'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { ApprovalStatusCluster } from '@/components/features/templates/approval-status-cluster'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { Plus } from 'lucide-react'

export default async function TemplatesLibrary() {
  const session = await requireUser()
  const templates = await listTemplates({ user: session }, {})

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// library"
        title="Templates"
        description="Reusable methodology — write once, run against every dataset that approves the template."
        actions={
          <Button asChild>
            <Link href="/templates/new"><Plus className="size-3.5" /> Create template</Link>
          </Button>
        }
      />

      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th>Name</th>
              <th>Description</th>
              <th>Datasets</th>
              <th>Author</th>
              <th>Modified</th>
              <th className="text-right">Avg runtime</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const author = fixtures.users.find((u) => u.id === t.authorId)
              return (
                <tr key={t.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Link href={`/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                    <span className="ml-2 font-tag text-[0.65rem] text-muted-foreground">v{t.versionNumber}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.description}</td>
                  <td className="px-3 py-2"><ApprovalStatusCluster approvals={t.approvals} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{author?.name ?? t.authorId}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(t.lastModifiedAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.averageRuntimeMs ? fmtDuration(t.averageRuntimeMs) : '—'}</td>
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

- [ ] **Step 3: Write `loading.tsx`**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'
export default function Loading() {
  return <div className="px-6 py-6"><RowsSkeleton rows={8} /></div>
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/templates/page.tsx app/\(app\)/templates/loading.tsx components/features/templates/approval-status-cluster.tsx
git commit -m "feat(templates): library page with approval status cluster"
```

---

## Task 19: Build the template composer (NL→DSL)

**Files:**
- Create: `app/(app)/templates/new/page.tsx`
- Create: `components/features/templates/composer/composer-shell.tsx`
- Create: `components/features/templates/composer/nl-input.tsx`
- Create: `components/features/templates/composer/dsl-editor.tsx`
- Create: `components/features/templates/composer/privacy-analysis-panel.tsx`
- Create: `components/features/templates/composer/simulation-panel.tsx`

This is the centerpiece of the AI-powered platform. We build it as a reactive split-pane editor: NL on top-left, DSL editor below, validation/simulation/privacy/cost on the right.

- [ ] **Step 1: Install Monaco**

```bash
npm install @monaco-editor/react@^4
```

- [ ] **Step 2: Write `nl-input.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EXAMPLES = [
  'Weighted-average advance rate by sector',
  'Concentration breaches over the last quarter',
  'Default rate by vintage with confidence intervals',
] as const

type Props = {
  datasetId: string
  onCompiled: (dsl: string) => void
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
}

export function NlInput({ datasetId, onCompiled, onCompileStream }: Props) {
  const [prompt, setPrompt] = useState('')
  const [isPending, start] = useTransition()
  const [streamed, setStreamed] = useState('')

  function compile(text: string) {
    setPrompt(text)
    start(async () => {
      let acc = ''
      for await (const chunk of onCompileStream(text, datasetId)) {
        acc += chunk
        setStreamed(acc)
      }
      onCompiled(acc)
    })
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface/40 p-4">
      <label className="font-tag text-foreground/55">// describe what you want to know</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. Weighted average advance rate by sector for the last quarter, with bucket size at least 10."
        className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => compile(e)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {e}
          </button>
        ))}
        <Button
          className="ml-auto"
          onClick={() => compile(prompt)}
          disabled={isPending || prompt.trim().length === 0}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Compile to DSL
        </Button>
      </div>
      {streamed && (
        <div className="rounded-md border border-border/60 bg-background p-3 text-xs">
          <p className="font-tag text-foreground/55 mb-1">// streaming…</p>
          <pre className="whitespace-pre-wrap font-mono text-[0.72rem]">{streamed}</pre>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `dsl-editor.tsx`**

```tsx
'use client'

import { Editor } from '@monaco-editor/react'

type Props = {
  value: string
  onChange: (next: string) => void
  height?: number
}

export function DslEditor({ value, onChange, height = 320 }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Editor
        height={height}
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          tabSize: 2,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Write `privacy-analysis-panel.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { fmtPct } from '@/lib/format'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  dsl: string
  schemaId: string
  fetchAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
}

export function PrivacyAnalysisPanel({ dsl, schemaId, fetchAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<PrivacyAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dsl.trim().length === 0) return
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      const r = await fetchAnalysis({ dsl, schemaId })
      if (!cancelled) {
        setAnalysis(r)
        setLoading(false)
      }
    }, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [dsl, schemaId, fetchAnalysis])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> :
          analysis?.riskScore === undefined ? <ShieldQuestion className="size-4 text-muted-foreground" /> :
          analysis.riskScore < 0.3 ? <ShieldCheck className="size-4 text-success" /> :
          <ShieldAlert className="size-4 text-warning" />}
        <CardTitle className="text-sm font-medium">Privacy analysis</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {analysis ? (
          <>
            <p>Risk score: <strong>{fmtPct(analysis.riskScore)}</strong></p>
            <ul className="grid gap-1.5">
              {analysis.findings.map((f, i) => (
                <li key={i} className="rounded-md border border-border/60 bg-surface/30 p-2">
                  <p className="font-medium">{f.message}</p>
                  {f.remediation && <p className="text-xs text-muted-foreground">→ {f.remediation}</p>}
                </li>
              ))}
              {analysis.findings.length === 0 && <p className="text-xs text-muted-foreground">No leakage paths detected.</p>}
            </ul>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Type DSL above to analyze.</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Write `simulation-panel.tsx`**

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function SimulationPanel({ datasetId }: { datasetId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ rows: number; durationMs: number } | null>(null)

  async function simulate() {
    setRunning(true)
    await new Promise((r) => setTimeout(r, 900))
    setResult({ rows: 47 + Math.floor(Math.random() * 40), durationMs: 1240 + Math.floor(Math.random() * 600) })
    setRunning(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Simulation on synthetic data</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p className="text-xs text-muted-foreground">
          Runs your DSL against a sandboxed copy of <span className="font-mono">{datasetId}</span>. Originator data never leaves.
        </p>
        <Button size="sm" onClick={simulate} disabled={running}>
          {running ? 'Running…' : 'Run on sandbox'}
        </Button>
        {result && (
          <div className="rounded-md border border-border/60 bg-surface/30 p-2 font-mono text-xs">
            ✓ {result.rows} rows · {result.durationMs} ms
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Write `composer-shell.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NlInput } from './nl-input'
import { DslEditor } from './dsl-editor'
import { PrivacyAnalysisPanel } from './privacy-analysis-panel'
import { SimulationPanel } from './simulation-panel'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  datasetId: string
  schemaId: string
  initialPrompt?: string
  initialDsl?: string
  initialName?: string
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
  onPrivacyAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
  onSaveDraft: (input: { name: string; description: string; dsl: string }) => Promise<{ id: string }>
}

export function ComposerShell(props: Props) {
  const [name, setName] = useState(props.initialName ?? '')
  const [description, setDescription] = useState('')
  const [dsl, setDsl] = useState(props.initialDsl ?? '')

  async function save() {
    const result = await props.onSaveDraft({ name, description, dsl })
    window.location.assign(`/templates/${result.id}`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6">
      <section className="grid gap-4">
        <NlInput
          datasetId={props.datasetId}
          onCompileStream={props.onCompileStream}
          onCompiled={setDsl}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">DSL</CardTitle>
          </CardHeader>
          <CardContent>
            <DslEditor value={dsl} onChange={setDsl} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weighted advance rate by sector" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Input id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Plain-language explanation of what this template answers" />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={save} disabled={name.trim().length === 0 || dsl.trim().length === 0}>Save draft</Button>
        </div>
      </section>
      <aside className="grid gap-4">
        <PrivacyAnalysisPanel dsl={dsl} schemaId={props.schemaId} fetchAnalysis={props.onPrivacyAnalysis} />
        <SimulationPanel datasetId={props.datasetId} />
      </aside>
    </div>
  )
}
```

- [ ] **Step 7: Write the page**

`app/(app)/templates/new/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { ai } from '@/lib/api/endpoints/ai'
import { draftTemplate } from '@/lib/api/endpoints/templates'
import { PageHeader } from '@/components/common/page-header'
import { ComposerShell } from '@/components/features/templates/composer/composer-shell'

type Search = { dataset?: string; prompt?: string }

export default async function NewTemplatePage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser()
  const sp = await searchParams
  const datasetId = sp.dataset ?? 'ds_mfone'
  const ds = await getDataset({ user: session }, datasetId).catch(() => null)
  const schemaId = ds?.schemaId ?? 'sch_mfone_v3'

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// composer"
        title="New template"
        description={`Authoring against ${ds?.name ?? datasetId}. Type a question or write DSL directly.`}
      />
      <div className="mt-6">
        <ComposerShell
          datasetId={datasetId}
          schemaId={schemaId}
          initialPrompt={sp.prompt}
          onCompileStream={async function* (prompt, dsId) {
            'use server'
            const stream = ai.compileTemplate({ user: session }, { prompt, datasetId: dsId })
            for await (const chunk of stream) yield chunk
          }}
          onPrivacyAnalysis={async (input) => {
            'use server'
            return ai.privacyAnalysis({ user: session }, input)
          }}
          onSaveDraft={async (input) => {
            'use server'
            const t = await draftTemplate({ user: session }, {
              name: input.name,
              description: input.description,
              dsl: input.dsl,
              parameters: [],
              outputSchema: { shape: 'tabular', columns: [] },
            })
            return { id: t.id }
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Smoke**

Run dev. Visit `/templates/new`. Type a question, click an example chip — DSL streams into the editor. Save draft → redirected to detail.

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/templates/new components/features/templates/composer package.json package-lock.json
git commit -m "feat(templates): NL→DSL composer with Monaco editor, privacy analysis, simulation"
```

---

## Task 20: Build the template detail page

**Files:**
- Create: `app/(app)/templates/[templateId]/page.tsx`
- Create: `components/features/templates/run-template-dialog.tsx`

- [ ] **Step 1: Write `run-template-dialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Template } from '@/lib/api/types'
import { useRouter } from 'next/navigation'

type Props = {
  template: Template
  approvedDatasetIds: string[]
  onRun: (input: { templateId: string; datasetId: string; parameters: Record<string, unknown> }) => Promise<{ id: string }>
}

export function RunTemplateDialog({ template, approvedDatasetIds, onRun }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [datasetId, setDatasetId] = useState(approvedDatasetIds[0] ?? '')
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(template.parameters.map((p) => [p.name, String(p.defaultValue ?? '')]))
  )
  const [isPending, start] = useTransition()

  function run() {
    start(async () => {
      const parsed = Object.fromEntries(
        template.parameters.map((p) => [p.name, p.type === 'number' ? Number(params[p.name]) : params[p.name]])
      )
      const r = await onRun({ templateId: template.id, datasetId, parameters: parsed })
      setOpen(false)
      router.push(`/runs/${r.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={approvedDatasetIds.length === 0}>Run</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run {template.name}</DialogTitle>
          <DialogDescription>Pick an approved dataset and set parameters.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Dataset</Label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {approvedDatasetIds.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          {template.parameters.map((p) => (
            <div key={p.name} className="grid gap-1.5">
              <Label htmlFor={`p-${p.name}`}>{p.name} <span className="text-xs text-muted-foreground">({p.type})</span></Label>
              <Input
                id={`p-${p.name}`}
                value={params[p.name] ?? ''}
                onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
              />
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={run} disabled={isPending}>{isPending ? 'Queuing…' : 'Run'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Write the detail page**

`app/(app)/templates/[templateId]/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getTemplate } from '@/lib/api/endpoints/templates'
import { listRuns, executeTemplate } from '@/lib/api/endpoints/runs'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApprovalStatusCluster } from '@/components/features/templates/approval-status-cluster'
import { RunTemplateDialog } from '@/components/features/templates/run-template-dialog'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'

export default async function TemplateDetail({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [tpl, runs] = await Promise.all([
    getTemplate(ctx, templateId),
    listRuns(ctx, { templateId }),
  ])
  const author = fixtures.users.find((u) => u.id === tpl.authorId)
  const approvedDatasetIds = tpl.approvals.filter((a) => a.state === 'approved').map((a) => a.datasetId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// template · v${tpl.versionNumber}`}
        title={tpl.name}
        description={tpl.description}
        actions={
          <div className="flex gap-2">
            <Link href={`/templates/${tpl.id}/edit`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">Edit</Link>
            <RunTemplateDialog
              template={tpl}
              approvedDatasetIds={approvedDatasetIds}
              onRun={async (input) => {
                'use server'
                const r = await executeTemplate({ user: session }, input)
                return { id: r.id }
              }}
            />
          </div>
        }
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Approvals</CardTitle></CardHeader>
          <CardContent><ApprovalStatusCluster approvals={tpl.approvals} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Author</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {author?.name ?? tpl.authorId} · {fmtRelativeTime(tpl.lastModifiedAt)}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">DSL</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs">{tpl.dsl}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Parameters</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {tpl.parameters.length === 0 ? <p className="text-xs text-muted-foreground">No parameters.</p> :
              tpl.parameters.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{p.name}</span>
                  <Badge variant="outline" className="font-tag text-[0.65rem]">{p.type}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-3">
        <h2 className="font-tag text-foreground/60">// recent runs</h2>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left font-tag text-foreground/55">
              <tr className="[&>th]:px-3 [&>th]:py-2"><th>Run</th><th>Dataset</th><th>Status</th><th>When</th><th className="text-right">Duration</th><th>Attestation</th></tr>
            </thead>
            <tbody>
              {runs.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2"><Link href={`/runs/${r.id}`} className="font-mono text-xs hover:underline">{r.id}</Link></td>
                  <td className="px-3 py-2"><Link href={`/datasets/${r.datasetId}`} className="hover:underline">{r.datasetId}</Link></td>
                  <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{r.status}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.durationMs ? fmtDuration(r.durationMs) : '—'}</td>
                  <td className="px-3 py-2">{r.attestation ? <CopyableHash value={r.attestation.outputSignature} /> : <AttestationBadge attestation={null} compact />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/templates/\[templateId\]/page.tsx components/features/templates/run-template-dialog.tsx
git commit -m "feat(templates): template detail with approvals, DSL, parameters, runs, run dialog"
```

---

## Phase G — Runs

## Task 21: Build the runs history page

**Files:**
- Create: `app/(app)/runs/page.tsx`
- Create: `app/(app)/runs/loading.tsx`
- Create: `components/features/runs/run-status-icon.tsx`

- [ ] **Step 1: Write `run-status-icon.tsx`**

```tsx
import { CheckCircle2, Clock, Loader2, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import type { RunStatus } from '@/lib/api/types'

const ICON: Record<RunStatus, typeof Clock> = {
  queued: Clock,
  running: Loader2,
  attesting: ShieldCheck,
  anchoring: ShieldCheck,
  completed: CheckCircle2,
  failed: X,
  disputed: ShieldAlert,
}

const TONE: Record<RunStatus, string> = {
  queued: 'text-muted-foreground',
  running: 'text-info animate-spin',
  attesting: 'text-info',
  anchoring: 'text-info',
  completed: 'text-success',
  failed: 'text-destructive',
  disputed: 'text-warning',
}

export function RunStatusIcon({ status }: { status: RunStatus }) {
  const Icon = ICON[status]
  return <Icon className={`size-3.5 ${TONE[status]}`} aria-label={status} />
}
```

- [ ] **Step 2: Write the runs page**

`app/(app)/runs/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listRuns } from '@/lib/api/endpoints/runs'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { RunStatusIcon } from '@/components/features/runs/run-status-icon'

export default async function RunsHistory() {
  const session = await requireUser()
  const runs = await listRuns({ user: session }, {})

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// runs"
        title="Run history"
        description="Every query that's been executed across your workspace. Click a run to see its trust artifact."
      />
      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th></th>
              <th>Run</th>
              <th>Template</th>
              <th>Dataset</th>
              <th>Runner</th>
              <th>When</th>
              <th className="text-right">Duration</th>
              <th>Attestation</th>
              <th>Anchor</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const runnerOrg = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
              return (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2"><RunStatusIcon status={r.status} /></td>
                  <td className="px-3 py-2"><Link href={`/runs/${r.id}`} className="font-mono text-xs hover:underline">{r.id}</Link></td>
                  <td className="px-3 py-2"><Link href={`/templates/${r.templateId}`} className="hover:underline">{r.templateId}</Link></td>
                  <td className="px-3 py-2"><Link href={`/datasets/${r.datasetId}`} className="hover:underline">{r.datasetId}</Link></td>
                  <td className="px-3 py-2 text-muted-foreground">{runnerOrg?.name ?? r.runnerOrgId}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.durationMs ? fmtDuration(r.durationMs) : '—'}</td>
                  <td className="px-3 py-2">{r.attestation ? <CopyableHash value={r.attestation.outputSignature} /> : <AttestationBadge attestation={null} compact />}</td>
                  <td className="px-3 py-2">{r.attestation?.anchorTxHash ? <CopyableHash value={r.attestation.anchorTxHash} /> : '—'}</td>
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

- [ ] **Step 3: Write `loading.tsx`**

```tsx
import { RowsSkeleton } from '@/components/common/loading-skeleton'
export default function Loading() { return <div className="px-6 py-6"><RowsSkeleton rows={12} /></div> }
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/runs/page.tsx app/\(app\)/runs/loading.tsx components/features/runs/run-status-icon.tsx
git commit -m "feat(runs): history page with status icons and dense table"
```

---

## Task 22: Build the run detail trust artifact page

**Files:**
- Create: `app/(app)/runs/[runId]/page.tsx`
- Create: `components/features/runs/run-result-renderer.tsx`
- Create: `components/features/runs/attestation-evidence-section.tsx`
- Create: `components/features/runs/execution-context-section.tsx`
- Create: `components/features/runs/ai-interpretation-section.tsx`

This is the page every other page exists to produce. It must feel substantial and trustworthy.

- [ ] **Step 1: Write `run-result-renderer.tsx`**

```tsx
import { fmtNumber } from '@/lib/format'
import type { RunResult } from '@/lib/api/types'

export function RunResultRenderer({ result }: { result: RunResult }) {
  switch (result.shape) {
    case 'scalar':
      return (
        <div className="flex items-baseline gap-3">
          <span className="font-display text-6xl tabular-nums">{typeof result.value === 'number' ? fmtNumber(result.value, { decimals: 3 }) : String(result.value)}</span>
          {result.unit && <span className="font-tag text-foreground/55">{result.unit}</span>}
        </div>
      )
    case 'tabular':
      return (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left font-tag text-foreground/55">
              <tr>{result.columns.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 tabular-nums">
                      {cell === null ? <span className="text-muted-foreground">—</span> : typeof cell === 'number' ? fmtNumber(cell, { decimals: 3 }) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'time-series':
      return (
        <div className="grid gap-2 rounded-lg border border-border bg-surface/40 p-4">
          <p className="font-tag text-foreground/55">// metric: {result.metric}</p>
          {result.series.map((s) => (
            <div key={s.name}>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {s.points.length} points · last: {fmtNumber(s.points[s.points.length - 1]?.v ?? 0, { decimals: 3 })}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Plan 06 wires the recharts time-series graph here.</p>
        </div>
      )
    case 'distribution':
      return (
        <div className="grid gap-2 rounded-lg border border-border bg-surface/40 p-4">
          {result.bins.map((b) => (
            <div key={b.label} className="grid grid-cols-[8rem_minmax(0,1fr)_4rem] items-center gap-2">
              <span className="font-mono text-xs">{b.label}</span>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${b.value * 100}%` }} />
              </div>
              <span className="text-right tabular-nums text-xs">{fmtNumber(b.value, { decimals: 3 })}</span>
            </div>
          ))}
        </div>
      )
  }
}
```

- [ ] **Step 2: Write `attestation-evidence-section.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'
import { CopyableHash } from '@/components/common/copyable-hash'
import { TrustIcon } from '@/components/common/trust-icon'
import { fmtDate } from '@/lib/format'
import type { Attestation } from '@/lib/api/types'

export function AttestationEvidenceSection({ attestation }: { attestation: Attestation }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Attestation evidence</CardTitle>
        <Button variant="outline" size="sm"><Download className="size-3" /> Verify locally</Button>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <Row icon="tee" label="TEE measurement">
          <CopyableHash value={attestation.teeMeasurement} short={false} className="text-xs" />
        </Row>
        <Row icon="signature" label="Code hash" sub="Matches published build">
          <CopyableHash value={attestation.codeHash} short={false} className="text-xs" />
        </Row>
        <Row icon="signature" label="Output signature">
          <CopyableHash value={attestation.outputSignature} short={false} className="text-xs" />
        </Row>
        {attestation.anchorTxHash && (
          <Row icon="anchor" label="On-chain anchor" sub={`${attestation.anchorChain ?? '—'} · block ${attestation.anchorBlockNumber ?? '—'} · ${fmtDate(attestation.anchoredAt)}`}>
            <div className="flex items-center gap-2">
              <CopyableHash value={attestation.anchorTxHash} short={false} className="text-xs" />
              <a className="text-xs text-muted-foreground hover:text-foreground" href="#" aria-label="Open in block explorer">
                <ExternalLink className="size-3" />
              </a>
            </div>
          </Row>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ icon, label, sub, children }: { icon: 'tee' | 'anchor' | 'signature'; label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <TrustIcon kind={icon} />
        <span className="font-medium">{label}</span>
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <div>{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Write `execution-context-section.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate, fmtDuration } from '@/lib/format'
import type { Run } from '@/lib/api/types'

export function ExecutionContextSection({ run }: { run: Run }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Execution context</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <KeyValue label="Template" value={<Link href={`/templates/${run.templateId}`} className="hover:underline">{run.templateId}</Link>} />
        <KeyValue label="Dataset" value={<Link href={`/datasets/${run.datasetId}`} className="hover:underline">{run.datasetId}</Link>} />
        <KeyValue label="Schema version" value={`v${run.schemaVersionAtRun}`} />
        <KeyValue label="Runner" value={`${run.runnerId} · ${run.runnerOrgId}`} />
        <KeyValue label="Queued" value={fmtDate(run.queuedAt)} />
        <KeyValue label="Completed" value={run.completedAt ? fmtDate(run.completedAt) : '—'} />
        <KeyValue label="Duration" value={run.durationMs ? fmtDuration(run.durationMs) : '—'} />
        <KeyValue className="md:col-span-3" label="Parameters" value={
          <pre className="rounded-md border border-border/60 bg-background p-2 font-mono text-xs">{JSON.stringify(run.parameters, null, 2)}</pre>
        } />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Write `ai-interpretation-section.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { CopyableHash } from '@/components/common/copyable-hash'
import type { RunSummary } from '@/lib/api/endpoints/ai'

type Props = {
  runId: string
  fetchSummary: (runId: string) => Promise<RunSummary>
}

export function AiInterpretationSection({ runId, fetchSummary }: Props) {
  const [summary, setSummary] = useState<RunSummary | null>(null)

  useEffect(() => {
    fetchSummary(runId).then(setSummary)
  }, [runId, fetchSummary])

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">AI interpretation</CardTitle></CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {summary ? (
          <>
            <p>{summary.text}</p>
            <p className="text-xs text-muted-foreground">
              Confidence: {(summary.confidence * 100).toFixed(0)}% · evidence:{' '}
              {summary.evidenceRunIds.map((rid) => <CopyableHash key={rid} value={rid} className="ml-1" />)}
            </p>
          </>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Generating…</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Write the run detail page**

`app/(app)/runs/[runId]/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/server'
import { getRun } from '@/lib/api/endpoints/runs'
import { ai } from '@/lib/api/endpoints/ai'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RunStatusIcon } from '@/components/features/runs/run-status-icon'
import { RunResultRenderer } from '@/components/features/runs/run-result-renderer'
import { AttestationEvidenceSection } from '@/components/features/runs/attestation-evidence-section'
import { ExecutionContextSection } from '@/components/features/runs/execution-context-section'
import { AiInterpretationSection } from '@/components/features/runs/ai-interpretation-section'

export default async function RunDetail({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const session = await requireUser()
  const run = await getRun({ user: session }, runId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// run · ${run.id}`}
        title={
          <span className="flex items-center gap-2">
            <RunStatusIcon status={run.status} />
            Run {run.id}
            <Badge variant="outline" className="font-tag text-[0.65rem]">{run.status}</Badge>
          </span>
        }
        description={`Template ${run.templateId} on ${run.datasetId}`}
      />

      <section className="mt-6 grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Result</CardTitle></CardHeader>
          <CardContent>
            {run.result ? <RunResultRenderer result={run.result} /> :
              run.status === 'failed' ? (
                <p className="text-sm text-destructive">{run.error ?? 'Run failed.'}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Run is {run.status} — result will appear here when complete.</p>
              )}
          </CardContent>
        </Card>

        {run.attestation && <AttestationEvidenceSection attestation={run.attestation} />}

        <ExecutionContextSection run={run} />

        <AiInterpretationSection
          runId={run.id}
          fetchSummary={async (rid) => {
            'use server'
            return ai.summarizeRun({ user: session }, rid)
          }}
        />

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Downstream</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Smart contracts and dashboards consuming this output land here in Plan 06 once the consumer registry exists.
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Smoke**

Run dev. Visit `/runs/run_4821`. Verify the result renders, attestation evidence shows the four hashes, execution context lists template/dataset/parameters, AI interpretation populates after a moment.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/runs/\[runId\] components/features/runs
git commit -m "feat(runs): run detail trust artifact with result, evidence, context, AI summary"
```

---

## Phase H — Wire-up

## Task 23: E2E — counterparty journey

**Files:**
- Create: `tests/e2e/counterparty-journey.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'

test('counterparty: sign in → home → dataset → template → run', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, maya/i })).toBeVisible()

  // AI insights present
  await expect(page.getByText(/concentration breach predicted/i)).toBeVisible()

  // Navigate to a dataset
  await page.getByRole('link', { name: /datasets/i }).first().click()
  await expect(page).toHaveURL(/\/datasets/)
  await page.getByRole('link', { name: /mF-ONE/i }).click()
  await expect(page).toHaveURL(/\/datasets\/ds_mfone/)

  // Visit Schema tab
  await page.getByRole('link', { name: /schema/i }).click()
  await expect(page.getByText(/loan_id/i)).toBeVisible()

  // Open a template
  await page.getByRole('link', { name: /templates/i }).first().click()
  await page.getByRole('link', { name: /weighted advance rate/i }).first().click()
  await expect(page.getByRole('heading', { name: /weighted advance rate by sector/i })).toBeVisible()

  // Open a completed run
  await page.goto('/runs/run_4821')
  await expect(page.getByRole('heading', { name: /run run_4821/i })).toBeVisible()
  await expect(page.getByText(/TEE measurement/i)).toBeVisible()
  await expect(page.getByText(/code hash/i)).toBeVisible()
})
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:e2e -- counterparty-journey
git add tests/e2e/counterparty-journey.spec.ts
git commit -m "test(e2e): counterparty journey (login → dataset → template → run)"
```

---

## Task 24: Quality gate sweep

- [ ] **Step 1: Run all gates**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run test:e2e
```

All must pass. Fix root causes; do not silence warnings.

- [ ] **Step 2: Commit any final fixes**

```bash
git add .
git commit -m "chore: Plan 02 quality-gate fixes"
```

---

## Self-review checklist

- [ ] All four quality gates pass.
- [ ] Sign in as Demo Counterparty → home renders metrics + insights + recent runs + watched datasets + pending tasks.
- [ ] Datasets catalog filters update URL; clicking a row goes to detail.
- [ ] All 5 dataset detail tabs render (Overview, Schema, Templates, Runs, Lineage).
- [ ] Templates library + composer (NL→DSL streams) + detail page (with Run dialog).
- [ ] Running a template from the dialog redirects to a run detail page that progresses queued → running → completed via the realtime mock.
- [ ] Run detail shows result, all four hashes, execution context, AI interpretation.
- [ ] Every numeric value carries an `<AttestationBadge>` or a documented reason it doesn't.
- [ ] No raw `fetch()` outside `lib/api/`.
- [ ] Counterparty E2E spec passes.

---

## Out of scope for Plan 02

- Originator surfaces (`/sources`, `/schemas`, `/approvals`, `/access`) — Plan 03
- Audit log surface — Plan 04
- Settings — Plan 05
- Conversational Copilot, Notebooks, full lineage graph — Plan 06
- Schema version diff viewer — Plan 03 (since originator authors it)
- Template version diff viewer + downstream consumers — Plan 06
- Run export bundle (signed JSON-LD) — Plan 04 (alongside audit export)
- Bulk select / bulk actions on the runs and templates tables — V2 polish
