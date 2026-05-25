# Hyve platform — design

**Date:** 2026-05-26
**Author:** Douwe (brainstormed with Claude)
**Status:** Approved, ready for implementation plan
**Scope:** Platform-wide. Multi-week build. Supersedes the operator-only framing in CLAUDE.md.
**Source spec:** `docs/spec.md` (treated as input; reconciled with this doc — Analysis vocab wins, AWS Nitro Enclaves only, etc.)

## Goal

Take the existing originator-console codebase and extend it into a unified, 3-actor platform: data owner + curator + public verifier, sharing one shell. Bake a strict typographic visual language into the design system so the "vibe-coded" anti-patterns currently scattered through `components/v2/` cannot regrow.

Hyve is the back-end-of-the-back-end for verified private data on tokenized RWAs. The data owner ingests private data once. The curator authors verified Analyses against it. The public verifier browses signed attestations. All three live in the same sidebar shell with role-additive nav. Anonymous visitors land in the same shell with their auth-gated items disabled-but-visible.

## Product framing (updates CLAUDE.md)

Hyve is **not** an operator console alone. It's a unified platform with three actors:

- **Data owner / originator** — uploads private datasets, defines schemas and per-column privacy posture, approves curator Analyses, controls publication.
- **Curator** — browses vaults, authors SQL Analyses against schemas, proposes them to owners, receives attested results, configures downstream delivery (oracle / webhook / API / visualization).
- **Public verifier** — anyone, no account. Browses the public attestation feed, opens attestation detail pages, verifies cryptographic proofs independently. The Dune-like public surface.

A single account can hold multiple roles (owner + curator). The shell adapts via additive nav items, not via mode toggle.

What Hyve still **is not**:

- Not an intelligence platform (no AI insights, news, commentary, analyst notes).
- Not an analytics dashboard. The closest thing is the `/explore` feed, which is signed-attestation discovery — not historical NAV charts or IRR trend lines.
- Not a fund admin tool. Allvue / SS&C Advent are internal ops; Hyve is the cross-org data-programming layer.
- Not a tokenization platform. Securitize tokenizes; Hyve makes the data behind tokenized assets programmable.

What changes vs prior CLAUDE.md framing:

- "Not an oracle" softens. The public explorer is oracle-adjacent — we host signed attestations as a public good. The curator's *Oracle* output tab pushes those attestations onchain. The platform doesn't sign values onchain itself; it produces what gets signed.
- The product is broader than the data-owner role. Curator + public-verifier surfaces are first-class.

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | spec.md extends CLAUDE.md, not replaces | Existing /vaults, /sources, /cp work is preserved; we add curator polish + public explorer |
| 2 | One mega-spec, one design doc (this one) | User chose this over decomposition; we sequence carefully |
| 3 | Banned anti-patterns: decorative eyebrow labels, decorative status dots, code-comment style labels, floating progress bars / signature pills / done glows | User correction; current codebase carries all four |
| 4 | Vocab: **Analysis** is canonical, not Query | Codebase + memory have the strict author/propose/approve/execute/sign lifecycle. Update spec.md to use Analysis throughout. SQL editor is one *surface* for authoring an Analysis. |
| 5 | Unified shell, sidebar-first, role-additive nav, no mode toggle | "No confusion where everyone sees something completely different" |
| 6 | Visual language: strict typographic hierarchy, no chrome | Type weight + constrained color palette. Status = colored verb. Freshness = tinted timestamp. No pills, no dots, no chips. |
| 7 | Continuity: V2 shell structure + warm-canvas feel sacred; v2/ui components open to rebuild | Keep what works, rebuild what carries chrome |
| 8 | Identity: one account, multiple roles, union of sidebar items | Real-world curators (Gauntlet) also originate. Two-account model = friction. |
| 9 | Anon scope: maximal read (/explore, /attestation/:id, /vault/:id, /verify, /search). Auth-gated items disabled-but-visible in sidebar, not hidden. | Open platform; transparent shape from any role. |
| 10 | Home pages take the Stripe/Plaid shape: onboarding checklist + resource cards, NOT a stats dashboard | Operators want to know what to do next, not read a wall of numbers |
| 11 | Analysis builder = Stripe Sigma 2-column shape, not 3-panel | 3-panel was overstuffed |
| 12 | Output tabs on the Analysis builder: Results · Visualize · Oracle · Webhook · API | Users have different delivery needs (onchain / dashboard / pull / push) |
| 13 | Dual-consent publication (owner + curator both opt-in to public) | Honors "more controls for both" framing |
| 14 | TEE = AWS Nitro Enclaves only | Override spec.md's "Intel SGX or AMD SEV" |
| 15 | Color palette gets visually calibrated via `ui-ux-pro-max` before any primitive ships | "Don't be ugly or cheap" — user requirement |
| 16 | Sequencing: rules + agents + tokens + primitives FIRST, then feature work | Otherwise anti-patterns regrow during the build |

## Scope

**In scope (this multi-week build):**

- Design system foundation: rules file, banned-pattern enforcement, new primitives, calibrated tokens
- Agent + skill updates: ui-component-dev, ui-design-reviewer, accessibility-auditor, hyve-driven-development; new `hyve-visual-language` skill
- Unified shell: role-additive sidebar, anon disabled state, identity model with multi-role support
- Owner Home + Curator Home in the Stripe/Plaid shape
- Public verification flow: `/explore`, `/attestation/[id]`, public `/vault/[id]`, `/verify`, `/search`
- Data ingestion flow refactor: source connect → vault → dataset → schema + privacy posture, dataset versioning, proposals inbox, audit timeline
- Analysis lifecycle flow: 2-column builder, output tabs (Results / Visualize / Oracle / Webhook / API), lifecycle states, dual-consent publication, executions, templates
- Search & Discovery: `/search` page + Cmd+K palette
- Cross-cutting: motion budget, loading/empty/error states, density, accessibility, responsive

**Out of scope (deferred):**

- Dark mode (architecturally allowed via tokens; not shipped)
- AI assistant bar ("Ask Hyve") — banned by CLAUDE.md "no intelligence platform" rule
- Custom Hyve illustrations on resource cards (stock vectors forbidden)
- User-saved Analysis templates (Hyve-provided templates only in MVP)
- Real OAuth / role admin workflows (MVP uses fixture-backed role grants)
- Dedicated search index (Postgres ILIKE/FTS in MVP; Meilisearch later)
- Onchain attestation registry (Oracle tab is configurable but the registry is a separate product)

---

## Section 1 — Design system foundation

Goal: make it structurally impossible to ship banned anti-patterns. If tokens and primitives don't carry chrome, components can't either.

### 1.1 Kill list

Deleted outright:

- `src/components/v2/ui/status-pill.tsx`
- `src/components/v2/ui/privacy-chip.tsx`
- Decorative dot color tokens in `vault-detail/privacy.tsx` (the `bg-v2-foreground/40` family that backs the rounded-full spans)
- Uppercase tracked eyebrow patterns (`text-[10px] uppercase tracking-[0.12em]`) used as section labels
- `// ── Section ──` JSX divider comments
- `aura-card` glow effects if they actually animate or pulse (kept if just subtle elevation)

### 1.2 New primitives

| Primitive | Replaces | Renders as |
|---|---|---|
| `<Status tone="success\|warning\|danger\|neutral\|info">Approved</Status>` | `status-pill` | colored `<span>`, text only, no border/fill |
| `<Timestamp at={date} />` | freshness dots | relative time ("2h ago") in subtly tinted muted text (≤24h muted green, 1–7d neutral, >7d muted red). Absolute on hover. No dot. |
| `<PrivacyLevel level="aggregate" />` | `privacy-chip` | inline colored label, used as a table cell value, not as a chip |
| `<Section>` + `<h2>`/`<h3>` | eyebrow patterns | structural hierarchy via heading level + spacing. No eyebrow text. |
| `<Disabled>` | n/a (new) | sidebar item visible-but-inert for anon; muted color; lock affordance on hover; click → sign-in prompt |
| `<ResourceCard>` | n/a (new) | Home-page resource card. Title + one-line description + verb CTA. No illustration. |

### 1.3 Tokens

Added to `globals.css`:

```
--status-success / --status-success-muted
--status-warning / --status-warning-muted
--status-danger  / --status-danger-muted
--status-info    / --status-info-muted
--status-neutral / --status-neutral-muted

--privacy-private    (red text)
--privacy-join       (amber)
--privacy-aggregate  (gold)
--privacy-dimension  (blue)
--privacy-select     (green)
```

These are **text-color tokens** — used as `color`, never as `background`. Existing `bg-v2-*` tokens that exist purely to fill chips get removed.

Pre-launch calibration gate: no hex value enters the codebase without a visual review pass via `ui-ux-pro-max`. Cheap-feeling colors invalidate every other rule.

### 1.4 Cross-cutting rules (encoded in `.claude/rules/visual-language.md`)

- Never ship a colored fill/border to label state. Use colored text.
- Never use uppercase tracked text as section ornament. Use heading hierarchy.
- Never use `//` style decorative labels in rendered UI.
- No glow / pulse / floating chrome. Subtle shadow for elevation is fine.
- Color is never the sole signal — always paired with text/label.

### 1.5 Migration sequence

1. Add new tokens + primitives.
2. Add ESLint `no-restricted-imports` blocking `status-pill`, `privacy-chip`. Add regex rules flagging eyebrow + decorative-dot patterns.
3. Migrate the three worst offenders: `vault-detail/access-panel.tsx`, `vault-detail/privacy.tsx`, `dataset-detail-page.tsx`.
4. Delete the banned files → build catches every remaining import.
5. Codemod sweep for the eyebrow regex; convert to semantic headings.

---

## Section 2 — Unified shell + identity model

### 2.1 Sidebar contents

**Universal (everyone, anon included):**

- Explore *(public attestation feed)*
- Search *(global: vaults, attestations, issuers)*
- Verify *(paste attestation → pass/fail)*

**Data Owner role adds:**

- Home (originator)
- Vaults
- Sources
- Proposals *(incoming Analyses awaiting approval)* — NEW
- Audit

**Curator role adds:**

- Home (curator)
- Browse Vaults
- My Analyses
- Executions

**Account section (bottom):**

- Settings *(anon: collapses to "Sign in")*

### 2.2 Visibility rules

| Viewer | Universal | Owner items | Curator items | Account |
|---|---|---|---|---|
| Anon | active | disabled (lock affordance) | disabled (lock affordance) | "Sign in" |
| Authed owner only | active | active | hidden | Settings |
| Authed curator only | active | hidden | active | Settings |
| Authed both | active | active | active | Settings |

Disabled items appear **only for anon**. Once signed in, you see only what's yours. Click on a disabled item → sign-in modal opens with `?returnTo=` set.

### 2.3 Grouping inside the sidebar

Sections separated by spacing + a thin divider line. No "DATA OWNER" eyebrow label (banned in §1). Grouping is implied by adjacency.

### 2.4 Identity model (MVP)

- `user.roles: ('owner' | 'curator')[]`
- Onboarding step (post-signup, before first Home): user picks
  - "Manage data" → `roles: ['owner']`
  - "Build analyses" → `roles: ['curator']`
  - "Both" → `roles: ['owner', 'curator']`
  - "Just exploring" → `roles: []` (authed, sees universal items + sign-in-style nudges)
- Settings has an "Add a role" affordance to upgrade later (no admin gate for MVP).
- Anon = no account, `roles: []`.

### 2.5 Auth & gating code shape

- `src/lib/auth/session.ts` — `getSession()` returns `{ user, roles } | null`. Mocked via fixture for MVP, swappable for real backend.
- `<RoleGate role="owner">...</RoleGate>` — client-side gate for components.
- `requireRole('owner')` helper for server components.
- `src/middleware.ts` — only handles routing for `/login` and `/onboarding`.
- Anon-accessible routes server-rendered without auth requirement: `/explore`, `/attestation/[id]`, `/vault/[id]` (read-only profile), `/verify`, `/search`.
- Auth-gated routes redirect to `/login?returnTo=<path>` if `getSession()` returns null.

### 2.6 Route map (existing + new)

| Route | Status |
|---|---|
| `/`, `/vaults/*`, `/sources/*`, `/audit`, `/datasets`, `/schemas` | Existing originator — kept, components refactored to honor §1 |
| `/cp/*` (analyses, executions, settings) | Existing curator — kept, refactored |
| `/login`, `/onboarding` | Existing — onboarding gets the role-picker step added |
| `/explore` | **NEW** anon-accessible attestation feed |
| `/attestation/[id]` | **NEW** anon-accessible attestation detail + proof verifier |
| `/vault/[id]` (public profile mode, singular) | **NEW** anon-accessible read-only profile (distinct from authed `/vaults/[id]`) |
| `/verify` | **NEW** anon-accessible "paste an attestation" proof checker |
| `/search` | **NEW** anon-accessible global search results |
| `/proposals` | **NEW** owner-only Analysis proposal inbox |
| `/settings` | Existing — expanded to handle role management |

Singular `/vault/[id]` (public) vs plural `/vaults/[id]` (owner) is the route convention.

### 2.7 Home pages — Stripe/Plaid shape

Both Owner and Curator Homes use the same onboarding-hub shape, not a dashboard.

**Owner Home (`/`):**

```
Hi, [name]. Welcome to Hyve.

Get your first vault verified                              2 of 5 complete ▾
  ✓  1. Verify your organization
  ✓  2. Connect your first source
  ○  3. Create your first vault                            [Start]
  ◌  4. Define schema + privacy posture
  ◌  5. Approve your first Analysis

Explore
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Quickstart   │  │ Schema       │  │ Privacy      │
  │ Hyve in 5min │  │ templates    │  │ posture      │
  └──────────────┘  └──────────────┘  └──────────────┘

Today's signal     (only renders after step 5)
  3 active vaults · 1 proposal awaiting your decision · last execution 14m ago
```

**Curator Home (`/cp`):**

```
Hi, [name]. Welcome to Hyve.

Get your first Analysis verified                          1 of 4 complete ▾
  ✓  1. Verify your organization
  ○  2. Browse vaults                                       [Browse]
  ◌  3. Author your first Analysis
  ◌  4. Get your first execution + attestation

Explore
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Sandbox      │  │ SQL          │  │ Privacy      │
  │ vault        │  │ templates    │  │ posture      │
  └──────────────┘  └──────────────┘  └──────────────┘

Recent activity      (only after first execution)
  Last Analysis: NAV vs ACRED, signed 2h ago · 3 in draft
```

Rules:

- Checklist states: done / in-progress / locked, rendered via type weight + a left-edge mark (filled / outlined / muted circle). No status pill, no dot, no eyebrow.
- "X of Y complete" is muted text, right-aligned. No progress bar.
- Resource cards: title + one-line description + verb CTA. No illustrations in MVP.
- "Today's signal" / "Recent activity" line is a single line of prose with subtle separators. No cards, no chips.
- Sidebar nav stays fully active for authed users from day one. Gating happens via **empty states inside pages**, not by disabling nav items.

---

## Section 3 — Public Verification flow

Five routes, all anon-accessible. Same shell as the rest of the platform.

### 3.1 `/explore` — attestation feed

Layout: rows (not cards), separated by 1px divider. Hover = subtle background tint, "View attestation →" appears at right.

```
Explore                                    [search bar]
                                           [filters: time · asset type · issuer]

ACRED · Apollo Diversified Credit · NAV verification
Result within 1.2% of reported                                          2h ago
   ⤷ View attestation

USDe Reserves · Ethena · Reserve composition
Result published                                                       4h ago
   ⤷ View attestation

Loan Tape Q1 · FalconX · Concentration check
Result private                                                         11d ago
   ⤷ View attestation
```

Rules:

- **Issuer · Asset** is heading-weight, the row anchor.
- Freshness = relative timestamp tinted per §1 (≤24h muted green, 1–7d neutral, >7d muted red). No dot.
- Verification type + result summary are plain text below. If unpublished: "Result private" in muted text.
- Header stats (top right): "12,847 attestations · 142 active vaults · 38 verified assets" — plain text, no chips.
- Alive feed: polls every 30s. New rows fade in at 200ms opacity. **No slide, no glow, no pulse.**
- Filters as selects, no chip row when active.

### 3.2 `/attestation/[id]` — attestation detail

```
ACRED · Apollo Diversified Credit
NAV verification · 2026-05-25 18:14 UTC

                                    [ Verify proof ]   ← prominent CTA

Result          NAV within 1.2% of reported value
Vault           ACRED Q1 2026 →
Curator         Gauntlet (with consent)
Analysis type   Aggregate NAV computation across all positions

Computation proof
   Enclave      AWS Nitro Enclave (verified)
   Hash         0x7a3f...8c12
   Verified     ✓ matched to genuine enclave fingerprint

Data integrity
   Ingestion    2026-05-25 17:00 UTC
   At query     hash matched, no tampering between ingestion and execution

Lineage
   Vault created 2026-01-12 · 47 attestations published · last 2h ago

   ⤷ More attestations from this vault
```

Rules:

- "Verify proof" runs client-side. Shows clear **PASS / FAIL** + brief one-line explanation. No success animation; state changes in place.
- Hashes in mono (Geist Mono). Other content in sans.
- TEE references use "AWS Nitro Enclave" (locked: no SGX, no SEV).
- Body copy uses "computation proof" / "secure computation environment" on first mention; "enclave" / "attestation" once defined (per CLAUDE.md "don't expose internal terminology").

### 3.3 `/vault/[id]` — public read-only profile

Distinct from `/vaults/[id]` (owner-controls). Anon-accessible.

```
ACRED Q1 2026                                       [ Request to query ]
Apollo Diversified Credit · Tokenized credit fund

47 attestations published · last 2h ago · queried by 6 curators

Schema preview                                                  (read only)
  loan_id         text          private    not queryable
  borrower_id     text          join       used to match across vaults
  loan_amount     numeric       aggregate  visible only in sums/averages
  origination_dt  date          dimension  groupable, filterable
  rating          text          select     queryable directly

Recent public attestations
  NAV verification · 2h ago · Gauntlet                                  →
  Concentration check · 1d ago · Gauntlet                               →
  Reserve composition · 4d ago · Steakhouse                             →

Verified by
  Gauntlet · 23 attestations
  Steakhouse · 18 attestations
  Maple Trade · 6 attestations

Lineage
  Vault created 2026-01-12 · schema updated 4 times · 47 attestations
```

Rules:

- Schema privacy level is inline colored text in the table cell (`<PrivacyLevel>` primitive). No chip.
- "Request to query" routes anon to sign-in with `?returnTo=` and a hint that curator role is needed.
- Vault profile shows aggregate counts only — never any actual queried values from the vault.

### 3.4 `/verify` — proof checker

Single-purpose page.

```
Verify an attestation

[ Paste an attestation JSON, attestation ID, or permalink                  ]

                                                              [ Verify → ]

──────────────────────────────────────────────────────────────────────────

What this checks
  · The attestation was generated by a genuine AWS Nitro Enclave
  · The data at query time matched the data as originally ingested
  · The query result is mathematically consistent with the enclave output
  · The signature chain is intact
```

After verify: result block appears inline. **Valid** = green text + four ✓ checks. **Invalid** = red text + the failed check called out. No modal, no animation.

### 3.5 `/search` — global search

Single results page. Anon-accessible. Results grouped by type via h3 subheadings. Anon: only public vaults, public attestations, issuers. Authed: see additional groups per role.

Full design in §6.

### 3.6 Cross-cutting copy

Public surface speaks to non-platform users. No "TEE" / "H3" / "enclave" in body copy on first mention. Use plain language on the public surface, "enclave" / "attestation" thereafter once primed via the `/verify` page or the attestation detail page's "What this checks" block.

---

## Section 4 — Data Ingestion flow

Owner-side: from "I have data" to "curators can query a verified version." Five surfaces plus the Owner Home (§2.7).

### 4.1 Vocab + hierarchy

- **Source** = ingestion connector (S3, Postgres, Stripe, custom API). Owned by an org. Can feed multiple vaults.
- **Vault** = logical container exposed to curators. Has metadata (name, asset type, status). Contains one or more datasets.
- **Dataset** = one structured table/file at a point in time. Has a schema. Has per-column privacy posture. Datasets within a vault are versioned (e.g., monthly NAV snapshots = a sequence of datasets in the same vault).
- **Schema** = column structure of a dataset — names, types, descriptions, privacy levels.

spec.md said vault contains a dataset (singular); codebase routes have `/vaults/[id]/data/[datasetId]` (plural). Codebase wins. spec.md gets updated.

### 4.2 Connect source — `/sources/new`

Existing modal flow (`add-source-modal/`), refactored to honor §1 rules.

Steps (plain-text step indicator at top of modal, current step in heading-weight, others muted, no progress pill):

1. Choose provider — S3, Postgres, Stripe, custom API. Grid of provider names + one-line descriptions. No illustrations in MVP.
2. Authenticate — provider-specific (OAuth, keys, connection string). Secrets never sent to client logs.
3. Discover — system enumerates what it found, shown as a typographic list.
4. Name + confirm — owner names the source, optional description.

Existing modal gets refactored to drop decorative chrome (status dots, eyebrow labels, signature pills, "done" glows).

### 4.3 Create vault — `/vaults/new`

Step flow. Same step-indicator pattern.

1. Vault name + asset type (credit fund / stablecoin reserves / loan tape / NAV data / custom).
2. Choose source(s) — pick existing or "connect new" (jumps to 4.2).
3. Define first dataset — point to specific data, optional cadence (one-time / daily / weekly / monthly).
4. Schema review — auto-detected schema in a table; owner edits names, types, descriptions inline.
5. Privacy posture — same table, rightmost column = `<PrivacyLevel>` select per row.
6. Review + create — summary in prose: "ACRED Q1 2026 will contain 1 dataset with 6 columns: 1 private, 1 join key, 2 aggregate-only, 1 dimension, 1 fully queryable. Curators will see this when they browse the vault."

No celebration animation. Routes straight to the new vault's detail page.

### 4.4 Schema + privacy posture editor

Lives at `/vaults/[id]/data/[datasetId]`. The owner's primary control surface.

```
ACRED Q1 2026 · April 2026 snapshot                          [ Edit schema ]

Column            Type     Privacy       Description
loan_id           text     private       Internal loan identifier
borrower_id       text     join          Used to match borrowers across vaults
loan_amount       numeric  aggregate     Original loan principal
interest_rate     numeric  aggregate     Annual percentage rate
origination_dt    date     dimension     Loan origination date
rating            text     select        Internal credit rating

Privacy summary
  1 private · 1 join · 2 aggregate · 1 dimension · 1 queryable
```

Rules:

- Privacy level is the colored word in the cell (`<PrivacyLevel>`). No chip.
- Changing a privacy level requires a confirmation modal stating the consequence in plain language: *"You're changing `loan_amount` from aggregate to select. Curators will be able to see individual loan amounts in query results."*
- All changes logged into lineage.
- Privacy summary is one line of plain text. No chart, no pie.

### 4.5 Dataset versioning

When a source has a cadence (monthly NAV, weekly loan tape), the system creates a new dataset on schedule.

- **Schema unchanged:** dataset auto-ingests, privacy posture inherited, status = active. Owner notified passively (sidebar count, no toast).
- **Schema drift** (new/removed/renamed columns): dataset enters `pending review`. Owner sees it on Home + in the vault's data tab with a "Review schema drift" CTA. Until reviewed, the new dataset isn't queryable.

Diff view shows added / removed / renamed columns side by side. Owner applies privacy posture to new columns, confirms removals.

### 4.6 Proposals inbox — `/proposals`

NEW. Owner's queue of incoming Analyses.

```
Proposals                                       3 awaiting your decision

Awaiting your decision
  NAV verification against ACRED Q1 · Gauntlet · 4h ago               →
  Concentration check on USDe Reserves · Steakhouse · 1d ago          →
  Reserve composition snapshot · Maple · 2d ago                       →

Recently decided
  Approved · Daily NAV check · Gauntlet · 2d ago
  Rejected · Direct borrower list · Gauntlet · 4d ago  (violated `private`)
  Approved · Monthly concentration · Steakhouse · 5d ago
```

Click a proposal → `/proposals/[id]` with:

- The Analysis (SQL, privacy compliance check pre-run, purpose statement)
- Curator identity + history
- Two buttons: **Approve** / **Reject**. Rejection requires a reason (free text, surfaced to curator)
- Optional: "Auto-approve future Analyses matching this pattern" toggle (saved as a rule, manageable in `/vaults/[id]/settings`)

### 4.7 Activity / audit timeline

`/vaults/[id]/activity` and `/audit` (existing routes, refactored).

```
2h ago   Gauntlet executed Analysis "NAV vs ACRED" · attestation signed
1d ago   You approved Analysis "NAV vs ACRED" proposed by Gauntlet
2d ago   You changed privacy posture for ACRED Q1 · loan_amount: select → aggregate
4d ago   System ingested new dataset for ACRED · schema unchanged
```

- Vertical list. No icons (we don't have a justified icon vocabulary).
- Actor (you / curator name / system) anchors each row.
- Day grouping uses plain `<h3>` ("Today" / "Yesterday" / date), no eyebrow.

---

## Section 5 — Analysis Lifecycle flow

Curator-side. Strict project vocab: *author → propose → approve → execute → sign* (memory-locked).

### 5.1 Curator Home

See §2.7.

### 5.2 Browse vaults — `/cp/vaults`

Catalog of accessible vaults. Row layout, not cards.

```
Browse vaults                                       [search] [filters]

Apollo Diversified Credit · ACRED Q1 2026
Credit fund · 6 columns · 47 public attestations · updated 2h ago
1 of your Analyses is active on this vault
                                                  [Open]   [New Analysis]

Ethena · USDe Reserves
Stablecoin reserves · 4 columns · 18 public attestations · updated 8h ago
No Analyses against this vault yet
                                                  [Open]   [Request access]
```

`[Open]` reveals schema preview (drawer or full page, anon-equivalent to `/vault/[id]`). `[New Analysis]` jumps into the Analysis builder with vault preselected. `[Request access]` sends a request to the owner.

### 5.3 Analysis builder — `/cp/analyses/new` (Stripe Sigma 2-column shape)

```
┌─────────────────────┬─────────────────────────────────────────────────┐
│ Schema · Templates  │  NAV verification                  [Save] [Run] │
│                     │                                                 │
│ [search]            │  ✓ Privacy check passed                         │
│                     │                                                 │
│ ACRED Q1 2026       │  1  SELECT                                      │
│   loan_id      prv  │  2    SUM(loan_amount) AS total_nav,            │
│   borrower_id  jn   │  3    COUNT(*) AS n_loans                       │
│   loan_amount  agg  │  4  FROM acred_q1_2026                          │
│   interest_rate agg │  5  WHERE origination_dt >= '2025-01'           │
│   origination_dt dim│  6    AND rating IN ('AAA','AA','A')            │
│   rating       sel  │  7  GROUP BY rating                             │
│                     │                                                 │
│ + Add vault         │  Purpose                                        │
│                     │  Verify aggregate NAV reported by Apollo …      │
│                     ├─────────────────────────────────────────────────┤
│                     │  Results   Visualize   Oracle   Webhook   API   │
│                     │  ───────                                        │
│                     │                                                 │
│                     │  rating    total_nav        n_loans             │
│                     │  AAA       $124,500,000     1,247               │
│                     │  AA        $89,200,000      934                 │
│                     │  A         $42,800,000      561                 │
│                     │                                                 │
│                     │  Data signed 2h ago · attestation 0x7a3f…       │
└─────────────────────┴─────────────────────────────────────────────────┘
```

**Left sidebar (~280px):**

- Analysis name + back arrow at top
- Two tabs: Schema · Templates
- Search bar (searches within active tab)
- Schema tree (vault → columns). Column row: `column_name <PrivacyLevel-abbrev>` (3 letters, colored text: `prv / jn / agg / dim / sel`). Click → insert. Private = muted, unclickable.
- Templates: Hyve-provided, flat list with one-line descriptions. No "BASIC REPORTS" / "PAYMENTS" eyebrow grouping. If grouping needed, plain-text h3.
- `+ Add vault` for joins.

**Center main area:**

- Top bar: Analysis name (inline-editable), `Save` and `Run` buttons top right.
- Privacy check status line under the top bar: `✓ Privacy check passed` (green) or `✗ 2 violations` (red, click expands list inline). Replaces the dedicated status panel.
- Monaco editor (Geist Mono, subtle syntax highlighting via weight, constrained palette).
- Purpose field below editor (required for propose; collapsible).
- `Run` is disabled if violations present or purpose empty.

**Output tabs (under editor):** `Results · Visualize · Oracle · Webhook · API`

Tab visual rules (§1 enforced): plain text labels. Active tab = heading-weight + 1px accent bottom-border. Inactive = muted normal weight. No fills, no pills, no icons.

| Tab | Content |
|---|---|
| **Results** | Sortable data table (mono numerics). Below: `Data signed [time] · attestation [hash] · [public/private toggle]` |
| **Visualize** | Chart-type picker (bar / line / KPI / table). 3–4 chart types max in MVP. Renders results. |
| **Oracle** | Configure destination chain + contract address (or oracle network: Pyth, Chainlink, RedStone). Payload format preview. `Publish onchain` button. History of onchain deliveries. |
| **Webhook** | URL + payload preview + auth header config. Test webhook button. Delivery history (status + latency). |
| **API** | Read-only endpoint URL for this Analysis's latest signed result. API key reference. `curl` example. |

### 5.4 Lifecycle states

| State | Owner sees | Curator sees |
|---|---|---|
| **author** (draft) | nothing | editing in builder |
| **propose** | new row in `/proposals` | "Sent · pending review" |
| **approve** / **reject** | clicks decision | notified; on reject sees reason |
| **execute** | system runs in AWS Nitro Enclave | "Running in enclave..." |
| **sign** | attestation signed | "Signed · attestation [hash]" |
| **publish** | toggle in vault Attestations tab | toggle on Analysis results page |

State surfaced inline in the builder (status line above editor + action buttons that change per state). No dedicated state panel.

### 5.5 Publication — dual-consent

After signing, attestation is **private by default** (visible only to owner + curator). For it to appear in `/explore`:

- Owner toggles "Make public" in the vault's Attestations tab.
- Curator toggles "Publish to feed" on the Analysis results page.

**Both must toggle on.** Either can revoke later (attestation reverts to private, removed from `/explore`).

Confirmation modal on toggle: *"This attestation will become public once the other party also opts in. The public version will show [vault name], [timestamp], and [result summary]. It will NOT show the SQL of your Analysis or any raw data."*

The "Verified by [curator]" credit on `/attestation/[id]` is a separate consent — curator opts in to credit, separate from result publication.

### 5.6 Executions — `/cp/executions`

```
Executions

NAV vs ACRED · ACRED Q1 2026 · signed 2h ago · public                    →
Concentration check · ACRED Q4 2025 · signed 1d ago · private            →
Reserve composition · USDe Reserves · signed 4d ago · public             →
NAV vs ACRED · ACRED Q1 2026 · running                                   →
```

Public / private / running as colored verb text per §1.

### 5.7 My Analyses — `/cp/analyses`

```
My Analyses                                                     [+ New]

Drafts
  Concentration test for ACRED                                          →
  Maple loan tape · borrower concentration                              →

Awaiting decision
  NAV vs ACRED Q1 · sent to Apollo · 4h ago                             →
  Reserve composition · sent to Ethena · 1d ago                         →

Approved & ready to execute
  Daily NAV check · auto-approved by Apollo                             →
```

Section headers (h3), no eyebrows.

### 5.8 Templates

Hyve-provided, read-only, 4–6 canonical shapes:

- NAV verification
- Concentration check
- Reserve composition
- Default rate aggregation
- Custom (blank)

User-saved templates are post-MVP.

---

## Section 6 — Search & Discovery

### 6.1 Two access paths

- **`/search`** route — full results page, anon-accessible.
- **Cmd+K / Ctrl+K palette** — keyboard-driven overlay, globally available. Built on shadcn `<Command>` (already installed).

Both hit the same query endpoint.

### 6.2 Cmd+K palette

```
┌─────────────────────────────────────────────────────────────┐
│  Search Hyve...                                             │
├─────────────────────────────────────────────────────────────┤
│  Vaults                                                     │
│    ACRED Q1 2026 · Apollo Diversified Credit                │
│    ACRED Q4 2025 · Apollo Diversified Credit                │
│                                                             │
│  Attestations                                               │
│    NAV verification · ACRED Q1 · 2h ago                     │
│    Concentration check · ACRED Q1 · 1d ago                  │
│                                                             │
│  My Analyses                  (curator only)                │
│    NAV vs ACRED · draft                                     │
│                                                             │
│  Press ↵ for full results                                   │
└─────────────────────────────────────────────────────────────┘
```

- Results grouped by type, max 3–5 per group.
- Group headers = h3 plain text.
- Arrow-key navigation, enter to select, enter on input → routes to `/search?q=...`.

### 6.3 `/search` page

```
Results for "acred"                                  [type ▾] [time ▾] [issuer ▾]

Vaults
  Vault · ACRED Q1 2026                                          47 attestations
  Apollo Diversified Credit · Credit fund                            updated 2h ago
                                                                                →

Attestations
  Attestation · NAV verification                                        Public
  ACRED Q1 2026 · Gauntlet                                              2h ago
                                                                                →
  + 23 more attestations from ACRED vaults                                      →

Issuers
  Issuer · Apollo Diversified Credit                                            
  4 vaults · 124 attestations · most recent 2h ago                              →
```

- Section headers = h3 plain text. No eyebrow.
- Filters above results = plain selects in a row. Active selections show in the button text. No chip row below.
- Per-row format consistent: `[Type] · [Primary identifier]` + metadata right-aligned; second line descriptor + timestamp right-aligned (tinted per §1); trailing `→` on hover.

### 6.4 What's searchable (by role)

| Searcher | Types in results |
|---|---|
| Anon | Vaults (public), Attestations (public), Issuers |
| Authed owner | + Sources, Datasets, Proposals (incoming), Analyses against their vaults |
| Authed curator | + Their own Analyses, Executions |
| Both roles | union |

Server-side filtered against session role.

### 6.5 No-results state

```
No results for "acred liquidity"

Try:
  · Searching for an issuer name
  · Browsing vaults → /vaults  (curator) or /cp/vaults
  · Checking the public attestation feed → /explore
```

Plain text. No illustration.

### 6.6 Indexing (implementation note, out of UI scope)

- MVP: Postgres `ILIKE` or FTS on a small field set (vault name, issuer name, attestation type, analysis name, purpose statement).
- Later: dedicated index (Postgres FTS / Meilisearch / Typesense).
- Default ranking: relevance score, recency tiebreaker.

### 6.7 Discovery patterns (cross-cutting)

Search complements the discovery surfaces already in §3.1, §3.2, §3.3, §5.2. Section 6 doesn't re-spec them.

---

## Section 7 — Cross-cutting

### 7.1 Motion budget

**Allowed:**

- 200ms opacity fade-in on new list content
- 150ms ease-out on hover state changes
- 200ms ease-out on collapse/expand
- 100ms transitions on output tab switches
- Native browser focus rings

**Banned:**

- Glows, pulses, shimmer
- Floating progress bars
- Spinners (replace with skeletons or status text)
- Slide-in on lists (override spec.md §5.5)
- Checkmark draw-on animations (override spec.md §5.5)
- `transform`-based motion that draws attention to itself

`prefers-reduced-motion: reduce` makes all 200ms fades instant.

### 7.2 Loading states

| Surface | State |
|---|---|
| List rows | 3–5 static skeleton rows, muted background, no shimmer |
| Detail page | Skeleton sections matching final layout, no shimmer |
| Analysis execution | Inline text "Running in enclave..." that updates by polling |
| Form submission | Button text changes ("Saving..."), button disabled |
| Search | Skeleton rows, optional "Searching..." muted text |

No spinners. Skeleton boxes are static.

### 7.3 Empty states

```
[Heading, h3 normal weight, muted]
[One sentence explaining what would appear here]
[Primary CTA — verb action]
```

No illustrations, no icons, no "fun" copy.

### 7.4 Error states

- **Validation (forms):** red text under the field, normal weight. Field-level only.
- **Network:** inline at section level. `Couldn't load attestations. [Retry]`
- **Server (500s):** catastrophic → full-page boundary. `Something went wrong. Please try again. If this persists, contact support.`
- **Authorization:** redirect to `/login?returnTo=<path>`. On anon-accessible pages with extra authed content: render anon view + inline banner.

### 7.5 Notifications / toasts (sonner)

Toasts only for **async confirmations** that don't already update inline. Auto-dismiss 5s, manual dismiss via X. Plain text. No icons. Subtle 1px accent border on the leading edge.

Banned toast use cases:

- Errors that should be inline
- Confirmations for things already visible
- Welcomes, tips, marketing

### 7.6 Density & spacing

| Token | Value |
|---|---|
| Base sans text | 14px |
| Table text | 13px |
| Mono (code, hashes, IDs) | 13px |
| Body line-height | 1.5 |
| Table line-height | 1.4 |
| Long-form prose | 1.6 |
| Spacing scale | 4px base — `--space-1` through `--space-10` (4–40px) |
| Section gap default | `--space-8` (32px) |
| Table row min-height | 40px |

Page max-width per existing V2 layout. Full-bleed exceptions: `/vaults/[id]/data/[datasetId]`, `/cp/analyses/[id]`.

### 7.7 Color usage summary

| Use | Source |
|---|---|
| Status verbs | `--status-success/warning/danger/info/neutral` |
| Privacy levels | `--privacy-private/join/aggregate/dimension/select` |
| Freshness tints (timestamps only) | muted-green / neutral / muted-red |
| Accent (active state, primary CTAs, focus) | `--accent` (forest green from CLAUDE.md, calibrated) |
| Surface | warm canvas (`--bg`), elevated white for cards (`--surface`) |

Dark mode: out of scope for MVP. Architecturally allowed via tokens; shipped later.

Calibration gate: no hex enters the codebase without `ui-ux-pro-max` visual review.

### 7.8 Responsive behavior

| Breakpoint | Behavior |
|---|---|
| Desktop ≥1280px | Primary surface |
| Tablet 768–1279px | Analysis builder sidebar collapses to a drawer; padding reduced ~25% |
| Mobile <768px | Public surfaces fully responsive. Auth'd power tools show "Best on desktop" message with critical read-only actions functional |

### 7.9 Accessibility (WCAG 2.2 AA)

- Keyboard-navigable everywhere
- Visible native focus rings
- Color never the sole signal (§1 enforces this — status is colored *text*, not colored fill)
- ARIA on icon-only controls (few in this design)
- Form fields labeled (no placeholder-as-label)
- Skip-to-content link in shell
- `accessibility-auditor` agent runs as mandatory reviewer on UI PRs

### 7.10 `<ResourceCard>` primitive

Used on Owner Home + Curator Home (§2.7). Spec:

- Title (heading-weight, normal size)
- One-line description (muted, normal weight)
- Verb CTA at the bottom
- Hover: subtle background tint
- No illustrations in MVP
- 3-up row by default; collapses to single column at tablet width
- Used only on Home pages

---

## Section 8 — Agent + skill updates

### 8.1 NEW: `.claude/rules/visual-language.md`

Single source of truth. Every UI agent reads it. Contents:

```
# Hyve Visual Language Rules — non-negotiable

## The Strict Typographic Rule
Information through type weight + a constrained color palette. Never chrome.

- Status        → colored verb in plain text. Never pills, dots, badges.
- Privacy level → colored word in plain text. Never chips.
- Freshness     → relative timestamp tinted. Never dots.
- Grouping      → heading hierarchy + spacing. Never eyebrow labels.

## Banned patterns
1. Decorative status dots (h-1 w-1 rounded-full bg-*)
2. Eyebrow uppercase tracked labels (text-[10px] uppercase tracking-*)
3. Code-comment style UI labels (// section, ── divider ──)
4. Floating progress bars, signature pills, done glows
5. Pulsing dots, rotating spinners, shimmer skeletons
6. Stock vector illustrations
7. Slide-in animations on lists
8. Color as the sole signal

## Required primitives
- <Status tone="...">          → state verb
- <Timestamp at={...} />        → freshness
- <PrivacyLevel level="..." /> → privacy
- <Section> + <h2>/<h3>         → hierarchy
- <Disabled>                    → sidebar items for anon
- <ResourceCard>                → Home only

## Color calibration
No hex enters the codebase without ui-ux-pro-max visual review.

## Motion budget
Allowed: opacity fades ≤200ms, hover ≤150ms, accordion ≤200ms.
Banned: everything else.

## Review enforcement
ui-design-reviewer + accessibility-auditor on every UI change.
Build fails on banned imports.
```

### 8.2 Agent updates

| File | Change |
|---|---|
| `.claude/agents/ui-component-dev.md` | Mandatory skill loads: `ui-ux-pro-max`, `frontend-design`. Mandatory rule file: `.claude/rules/visual-language.md`. Forbidden imports declared inline. Must use required primitives. |
| `.claude/agents/ui-design-reviewer.md` | Mandatory skill loads: `ui-ux-pro-max`, `web-design-guidelines`. Review checklist gains 8 banned-pattern checks. Cheap palette → fail; request calibration. |
| `.claude/agents/accessibility-auditor.md` | Add §7.9 checks (prefers-reduced-motion, skip-to-content, color-not-sole-signal). |
| `.claude/skills/hyve-driven-development/` | Dispatcher updated: UI tasks auto-load ui-ux-pro-max + visual-language rules. ui-design-reviewer + accessibility-auditor mandatory paired reviewers on UI changes. |

### 8.3 NEW: `.claude/skills/hyve-visual-language/`

For complex enforcement and primitive design decisions. Used when an agent:

- Adds a new primitive (check against rules + propose token additions)
- Refactors a component carrying banned chrome
- Resolves cases where spec.md and the visual rules conflict (rules win)

### 8.4 Build-time enforcement (ESLint)

```js
{
  patterns: [
    { group: ['*/components/v2/ui/status-pill'], message: 'Use <Status> from @/components/ui/status' },
    { group: ['*/components/v2/ui/privacy-chip'], message: 'Use <PrivacyLevel> from @/components/ui/privacy-level' }
  ]
}
```

Plus custom regex rules:

- `text-\[10px\].*uppercase.*tracking-` → eyebrow pattern, fail
- `bg-\w+-\d{3}.*rounded-full.*h-1.*w-1` → decorative dot, fail

Build fails on either.

### 8.5 CLAUDE.md updates

1. **Product context** — rewrite to describe the 3-actor platform. Keep the NOT list but adjust "Not an oracle" softening (Oracle output tab is downstream).
2. **NEW Visual language section** — single-paragraph summary pointing to `.claude/rules/visual-language.md`.
3. **Skills in Use** — replace `ui-minimalist` with `ui-ux-pro-max`. Add `hyve-visual-language`.
4. **Non-Negotiable Rules** — add rule 8: "Strict typographic rule. See `.claude/rules/visual-language.md`. Any UI change must pass ui-design-reviewer."
5. **Architecture Principles** — add principle 6: "Composition lives on top of typographic primitives, not on top of chrome primitives."

### 8.6 AGENTS.md updates

```
# This is NOT the Next.js you know
This version has breaking changes — read node_modules/next/dist/docs/ before writing code.

# This codebase has a strict visual language
See .claude/rules/visual-language.md. ui-design-reviewer fails on banned patterns.
Build fails on banned imports.

# The agent system uses Hyve-driven development
See .claude/skills/hyve-driven-development/SKILL.md. Specialists own their file types.
Main session never writes UI code directly — always dispatch ui-component-dev.
```

---

## Sequencing (the discipline)

Foundation first. No feature work until 1–9 are done.

1. Write `.claude/rules/visual-language.md`
2. Write `.claude/skills/hyve-visual-language/SKILL.md`
3. Update `.claude/agents/ui-component-dev.md`, `ui-design-reviewer.md`, `accessibility-auditor.md`
4. Update `.claude/skills/hyve-driven-development/SKILL.md`
5. Update `CLAUDE.md` and `AGENTS.md`
6. Add ESLint rules
7. Run color palette calibration via `ui-ux-pro-max` — produces concrete token values
8. Add §1 primitives: `<Status>`, `<Timestamp>`, `<PrivacyLevel>`, `<Section>`, `<Disabled>`, `<ResourceCard>`
9. Migrate banned-pattern usages, delete `status-pill.tsx`, `privacy-chip.tsx`
10. Begin feature work for §3–§6 (public flow, ingestion refactor, Analysis builder, search)

Each of 1–10 will produce its own implementation plan. This design doc is the parent.

---

## Open questions / followups

Not blocking, but worth tracking as the build proceeds:

- Onchain attestation registry — referenced in the Oracle output tab. Out of scope for this build; spec separately.
- Real OAuth + role admin — MVP uses fixture-backed identity; production gets a separate auth integration spec.
- User-saved Analysis templates — deferred to post-MVP.
- Dark mode — architecturally allowed via tokens; spec separately when prioritized.
- The `/audit` route's relationship to per-vault activity — clarify whether `/audit` is the org-wide rollup or also per-vault.
- Webhook signing / verification — what does Hyve sign on outbound webhooks so the consumer can verify the source?
- API authentication for the API output tab — separate spec.

---

## Implementation plan handoff

This doc is the design. The next step is to invoke the `writing-plans` skill to produce an implementation plan starting at step 1 of the §Sequencing section. Each step in §Sequencing produces its own implementation plan; they execute in order.
