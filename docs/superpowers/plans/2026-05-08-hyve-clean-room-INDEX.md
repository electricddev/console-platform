# Hyve Data Clean Room — Plan Series Index

> **Audience:** Engineers executing this work and reviewers understanding the shape of the build. Read this index first before opening any individual plan.

**Goal:** Ship the Hyve Data Clean Room — the technical user surface of Hyve Verant. AI-powered data engineering & analytics platform for verifiable, confidential data collaboration on tokenized RWAs.

**Source spec:** the Page Composition document supplied 2026-05-08 (sections §1–§9). When this index conflicts with the spec, the spec wins.

---

## 1. Sequencing

The work is split into six plans. Each plan ships working software that can be demoed and merged on its own. Plans must be executed in order — later plans assume primitives, routes, mock data, and types from earlier plans.

| # | Plan | File | Ships |
|---|---|---|---|
| 01 | Foundation | `2026-05-08-01-foundation.md` | Authenticated app shell at `/`, design system extension, mock API + Zod schemas, stub auth, command palette, edge states, test infra |
| 02 | Counterparty MVP | `2026-05-08-02-counterparty-mvp.md` | Login + onboarding, Home (counterparty), Datasets catalog + detail, Templates library + composer + detail, Runs history + run detail |
| 03 | Originator surface | `2026-05-08-03-originator-surface.md` | Home (originator), Sources + connect wizard + source detail, Schemas + editor, Approvals + review, Counterparty Access matrix |
| 04 | Audit log | `2026-05-08-04-audit-log.md` | `/audit` timeline + table, filters, saved queries, signed-bundle export |
| 05 | Settings | `2026-05-08-05-settings.md` | Organization, Members, Wallets, Integrations, Notifications, Billing, Security |
| 06 | V2 — Copilot, Notebooks, Lineage | `2026-05-08-06-v2-copilot-notebooks.md` | Conversational copilot at `/copilot`, notebook surface at `/notebooks`, full lineage graph, edge-state polish |

After Plan 06 the MVP scope from spec §7.1 is complete plus the V2 items from spec §7.2 except the "Counterparty access matrix" (which is in Plan 03 since it's the originator's tool) and "Advanced billing / SSO / IP allowlists" (which land partially in Plan 05).

---

## 2. Cross-cutting architecture

These decisions apply to every plan. Don't relitigate them inside a plan; come back here and update if a decision changes.

### 2.1 Project layout (flat, NOT `src/`)

The repo uses the flat Next.js layout (`app/`, `components/`, `lib/`) — **not** `src/app/` as CLAUDE.md aspirationally describes. Path alias `@/*` resolves from repo root. We keep flat layout to avoid a churn migration that produces no user-visible work.

```
app/                            Next.js App Router routes
  (auth)/                       Route group: unauthenticated routes (login, onboarding)
  (app)/                        Route group: authenticated dashboard
    layout.tsx                  Auth wall + persistent shell
    page.tsx                    Home (role-aware dashboard)
    datasets/
    templates/
    runs/
    sources/                    Originator-only — gated in middleware/layout
    schemas/
    approvals/
    access/
    audit/
    copilot/
    notebooks/
    settings/
  not-found.tsx
  error.tsx
  globals.css
  layout.tsx                    Root html/body shell + fonts
components/
  ui/                           shadcn primitives — owned
  shell/                        Persistent app shell (sidebar, topbar, palette)
  common/                       Reusable feature-agnostic primitives (attestation badge, etc.)
  features/<area>/              Feature-scoped components (datasets/, templates/, runs/, …)
lib/
  api/
    client.ts                   Mock fetch client; simulates latency, errors, streaming
    schemas.ts                  Zod schemas for ALL API responses
    types.ts                    Inferred TypeScript types (`z.infer<…>`)
    fixtures/                   Realistic mock data, one file per resource
    endpoints/                  Typed wrappers per resource (datasets.list, runs.get, …)
  auth/
    session.ts                  Stub session (encrypted cookie via `iron-session`)
    types.ts
    server.ts                   Server-only helpers: `requireUser()`, `requireRole()`
  format.ts                     Number, currency, date, hash, duration formatters
  hooks/                        Reusable React hooks
  utils.ts                      Existing `cn()` etc.
tests/
  unit/                         Vitest specs colocated by area
  e2e/                          Playwright specs
docs/
  superpowers/plans/            This series
```

### 2.2 Data layer — mock-first with Zod (per spec §2 "Backend Integration", swap-in later)

There is **no Rust backend yet**. The UI must run end-to-end against a typed mock layer that simulates the network. Implementation rules:

1. **All shapes go through Zod first.** Define every API response in `lib/api/schemas.ts`. Infer TypeScript types from Zod (`export type Dataset = z.infer<typeof DatasetSchema>`). Never define types separately.
2. **Fixtures are the source of truth for mock state.** One file per resource in `lib/api/fixtures/`. Fixtures must round-trip through their Zod schema at module load (asserts shape correctness — see Plan 01 Task 12).
3. **Endpoints live in `lib/api/endpoints/<resource>.ts`.** Each function returns typed data. Functions accept an opaque `RequestContext` (cookies, signal). Server Components call them directly. Client Components call them through SWR or RSC props.
4. **Latency + error simulation.** The mock client respects `?delay=N` and `?fail=N%` URL params and a `MOCK_LATENCY_MS` env var. Default latency 250ms ± 100ms jitter.
5. **Streaming surfaces are simulated by async generators.** Run progress, Copilot tokens, ingestion completeness all stream via async iterators that yield over time.
6. **Real-API swap-in is a single file change.** When the Rust API exists, replace `lib/api/client.ts` with one that hits real URLs. All endpoint wrappers, schemas, and call sites stay identical.

### 2.3 Auth — stub session, three demo personas

`/login` shows "Sign in as…" buttons:

- **Demo Counterparty** (Maya at Gauntlet) — sees counterparty surfaces only
- **Demo Originator** (Tom at Trade Finance Lender) — sees originator surfaces only
- **Demo Curator + Originator** (rare dual role) — sees both

Stub session is an encrypted cookie via `iron-session`. Server helper `requireUser()` returns the session or redirects to `/login`. `requireRole('originator')` returns 403 on mismatch.

A floating dev-only **role switcher** (top-right of `(app)/layout`, only visible when `process.env.NODE_ENV !== 'production'`) lets reviewers swap personas without re-logging in. Removed in production builds.

### 2.4 Routing conventions

- App Router only. No Pages Router.
- Server Components by default; `"use client"` only when the component needs state, effects, or browser APIs.
- Server Actions for mutations (forms post via `<form action={…}>`).
- Every route segment that fetches data has a `loading.tsx` (skeleton).
- Every route segment that can fail has an `error.tsx` (recovery UI).
- Originator-only segments (`/sources`, `/schemas`, `/approvals`, `/access`) call `requireRole('originator')` in their segment `layout.tsx`.

### 2.5 Styling conventions

- Tailwind v4 via the existing `app/globals.css` (`@import "tailwindcss"`). Tokens in `:root` and `.dark`.
- **Never hardcode colors.** Use CSS variables (`bg-background`, `text-foreground`, `bg-surface`, `text-muted-foreground`, `border-border`, `bg-accent`, `bg-destructive/10`, etc.).
- Three font roles: `font-sans` (body, Geist), `font-mono` (technical strings, hashes, IDs, Geist Mono), `font-display` / `font-serif` (headlines, Instrument Serif). Plus `font-tag` utility for the deck's mono uppercase chips (already in `globals.css`).
- Density mode (compact vs. comfortable) is a CSS variable swap on `<body>` controlled by user preference (Plan 01 Task 4). Default is compact for the technical surface.
- shadcn radix-nova style is configured (see `components.json`). Use `npx shadcn@latest add <name>` to install primitives. Always import from `@/components/ui/<name>`.

### 2.6 Trust signals (the recurring visual primitive)

Per spec §6.1 and §6.5, every value displayed must answer "where did this come from?" within one interaction. Plan 01 ships these primitives once and every later plan uses them:

- `<AttestationBadge runId hash />` — small chevron next to a value; hover-reveals popover with TEE measurement + on-chain anchor link.
- `<FreshnessIndicator timestamp />` — colored dot + "live / 2m / stale (6h+)".
- `<CopyableHash value short />` — monospace, click-to-copy with checkmark feedback.
- `<MonoText>` — tabular figures, monospace.
- `<TrustIcon kind="tee" | "anchor" | "signature" />` — consistent iconography.

**Never** display a number that originated in mock data without an `<AttestationBadge>`. The fixtures include attestation data; treat it as load-bearing.

### 2.7 AI surfaces — the mock contract

The platform is positioned as AI-native. The mock layer provides AI endpoints from day one:

- `ai.summarize(runId)` — plain-language summary of a result
- `ai.compileTemplate(prompt, datasetId)` — NL → DSL stream
- `ai.privacyAnalysis(templateDsl, schemaId)` — leakage risk + recommendations
- `ai.suggestQueries(datasetId)` — three suggested questions
- `ai.detectAnomalies(datasetId)` — anomaly cards for the home feed
- `ai.copilotChat(history)` — streaming chat (Plan 06)

All AI endpoints stream. Every AI claim must include `evidenceRunIds: string[]` so the UI can render attestation citations. Plan 01 ships the contract and a deterministic mock implementation; never invent numbers in the UI.

### 2.8 Real-time surfaces

A small set of values are "live" — they animate as state changes. The mock layer exposes a `subscribe<T>(topic, handler)` API backed by `BroadcastChannel` + a setInterval pumper. Live topics:

- `runs.progress` — emits status transitions for in-flight runs
- `ingestion.completeness` — emits per-source completeness updates
- `notifications` — emits new notification events
- `network.health` — emits TEE / anchor status flips

Production swap-in: replace `subscribe` with a WebSocket client.

### 2.9 Testing strategy

- **Unit (Vitest + jsdom + Testing Library):** every utility, every hook, every Zod schema, every component with non-trivial state. Tests live in `tests/unit/<area>/<file>.test.ts(x)`.
- **E2E (Playwright):** one happy-path spec per major user journey. `tests/e2e/<journey>.spec.ts`. Each plan adds at least one E2E.
- **TDD discipline:** tasks in each plan are written test-first. Write the failing test, run it red, write the minimum impl, run it green, commit.

### 2.10 Quality gates (run before every commit in every plan)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint, zero warnings
npm run test        # vitest run
npm run build       # next build (catches RSC boundary errors)
```

`npm run test:e2e` runs in CI on push, not locally on every commit (slow).

---

## 3. Shared types (defined in Plan 01, used everywhere)

These are the load-bearing types every later plan references. Full Zod definitions land in `lib/api/schemas.ts` in Plan 01 Task 11. **Sketch only** here:

```ts
// User & identity
type Role = 'counterparty' | 'originator' | 'admin'
type User = { id: string; name: string; email: string; org: Org; signingKey: string; lastLoginAt: string }
type Org = { id: string; name: string; logoUrl?: string; assetClasses: AssetClass[]; verified: boolean }
type AssetClass = 'private-credit' | 'trade-receivables' | 'flow-credit' | 't-bills' | 'multi-asset'

// Datasets
type Dataset = {
  id: string; name: string; originator: Org; assetClass: AssetClass
  schemaId: string; schemaVersion: number
  recordCount: number; lastAttestedAt: string; completenessPct: number
  status: 'active' | 'paused' | 'archived'
  description?: string
  templateCount: number; lifetimeRunCount: number
  attestation: Attestation
}

// Schemas
type Schema = {
  id: string; datasetId: string; version: number; publishedAt: string
  fields: SchemaField[]
  policy: { kAnonymity: number; maxQueriesPerCounterpartyPerDay: number; allowedTimeRanges?: string[] }
}
type SchemaField = {
  name: string; type: 'string' | 'number' | 'date' | 'currency' | 'enum' | 'bool'
  exposure: 'queryable' | 'aggregated-only' | 'private'
  minBucketSize?: number; allowedOperators?: ('sum'|'avg'|'count'|'min'|'max')[]
  description?: string; isPii: boolean
}

// Templates
type Template = {
  id: string; name: string; description: string
  authorId: string; orgId: string
  versionId: string; versionNumber: number; lastModifiedAt: string
  parameters: TemplateParameter[]
  outputSchema: OutputSchema
  dsl: string
  approvals: TemplateApproval[]   // per-dataset state
  tags: string[]
}
type TemplateApproval = {
  datasetId: string
  state: 'unsubmitted' | 'pending' | 'approved' | 'denied' | 'changes-requested'
  approvedAt?: string; approverId?: string; signature?: string
  constraints?: ParameterConstraint[]
}

// Runs
type Run = {
  id: string; templateId: string; templateVersionId: string
  datasetId: string; schemaVersionAtRun: number
  runnerId: string; runnerOrgId: string
  parameters: Record<string, unknown>
  status: 'queued' | 'running' | 'attesting' | 'anchoring' | 'completed' | 'failed' | 'disputed'
  queuedAt: string; startedAt?: string; completedAt?: string
  durationMs?: number
  result?: RunResult
  attestation?: Attestation
}
type Attestation = {
  teeMeasurement: string         // hex hash, hardware-signed
  codeHash: string               // matches published build
  outputSignature: string        // signs the result
  anchorTxHash?: string          // on-chain anchor
  anchorBlockNumber?: number
  anchorChain?: 'ethereum' | 'base' | 'optimism'
  anchoredAt?: string
}

// Audit
type AuditEntry = {
  id: string; timestamp: string
  actorId: string; actorOrgId: string; signingKey: string
  action: 'approved-template' | 'denied-template' | 'executed-query' | 'published-result' | …
  resourceType: 'dataset' | 'template' | 'run' | 'schema' | 'access-grant'
  resourceId: string
  hash: string                   // entry-level hash
  merkleProof?: string
  anchorTxHash?: string
}

// Notifications
type Notification = {
  id: string; createdAt: string; read: boolean
  kind: 'attestation-published' | 'approval-requested' | 'completeness-alert' | …
  title: string; body: string
  resourceType?: string; resourceId?: string
  severity: 'info' | 'warning' | 'critical'
}

// AI
type AIInsight = {
  id: string; generatedAt: string
  claim: string                   // human-readable
  evidenceRunIds: string[]        // attestation chain — REQUIRED
  severity: 'info' | 'warning' | 'critical'
  suggestedAction?: { label: string; href: string }
}
```

If a later plan needs a new top-level type, add it to `lib/api/schemas.ts` in that plan's first task, not as a one-off.

---

## 4. Cross-cutting acceptance criteria

These hold for every plan; don't repeat them inside individual tasks unless a plan has a stricter version.

- TypeScript strict mode passes (no `any`, prefer `unknown` and narrow).
- Every fetch call goes through `lib/api/endpoints/*`. No raw `fetch()` outside `lib/api/`.
- Every value rendered from API data has an `<AttestationBadge>` or a documented reason it doesn't (e.g., it's a count of fixtures, not data under attestation).
- Every interactive component is keyboard-accessible (Tab, Enter, Esc) and respects `prefers-reduced-motion`.
- WCAG 2.2 AA contrast holds for all default and dark variants.
- LCP < 2.5s on a cold home dashboard load (`npm run build && npm run start`, throttled CPU 4×).
- All tests pass; coverage of new lib code ≥80%.

---

## 5. Out of scope (per spec §8)

These do **not** appear in any plan in this series:

- Hyve Verant Console / Risk Dashboard — separate white-label product
- Hyve H3 storage layer operator UI
- Smart contract SDK / on-chain consumer documentation
- Mobile (read-only consumption mentioned in spec §7.3 V3) — not in this series
- Cross-org template marketplace (V3) — not in this series
- A real Rust backend — frontend agents stop at the mock boundary

---

## 6. How to use this index

1. **Reviewers:** read this index, then skim the table of contents of each plan. Push back on architecture decisions here, not inside a plan task.
2. **Engineers executing plans:** read this index once. Then open the plan you're executing and follow it step by step. When a task references a "shared type," it lives in `lib/api/schemas.ts` and was defined earlier in the series.
3. **Plan authors writing follow-up work:** if you need a new shared decision, update §2 of this index in the same PR. Don't bury cross-cutting decisions inside a feature plan.

---

## 7. Status

| Plan | Status |
|---|---|
| Index (this file) | Drafted 2026-05-08 |
| 01 Foundation | Drafted 2026-05-08 — ready to execute |
| 02 Counterparty MVP | Drafted 2026-05-08 — ready after Plan 01 ships |
| 03 Originator surface | Drafted 2026-05-08 — ready after Plan 02 ships |
| 04 Audit log | Drafted 2026-05-08 — ready after Plan 03 ships |
| 05 Settings | Drafted 2026-05-08 — ready after Plan 01 ships (parallelizable with 02–04) |
| 06 V2 (Copilot, Notebooks, Lineage) | Drafted 2026-05-08 — ready after MVP plans (01–05) ship |
