# Hyve Platform — Product Specification & Design Brief

> This document serves as both a product specification and an AI prompt. It describes the Hyve platform in sufficient detail for an AI assistant to generate production-grade UI code that is functionally correct, visually distinctive, and narratively coherent.

---

## 1. What Hyve Is

Hyve is a privacy-preserving data verification platform for onchain finance. It allows two parties — a **data owner** and a **data consumer** — to interact over private financial data without the data ever being exposed.

The core primitive: a data owner uploads encrypted financial data (loan tapes, reserve compositions, NAV calculations, transaction histories). A data consumer constructs a SQL query against that data. The query executes inside a Trusted Execution Environment (TEE) where the data is temporarily decrypted, computed on, and the result leaves the enclave along with a cryptographic attestation — a proof that the computation was executed correctly on untampered data. The raw data never leaves the enclave. Neither Hyve nor the consumer ever sees it.

On top of this, a third actor — the **public verifier** — can browse published attestations without any authentication. These are the cryptographic receipts that say "this dataset was queried at this time, and the result was X, and the computation was executed correctly inside a genuine TEE." The data owner chooses which attestations to publish and which to keep private.

The platform exists to solve a specific scaling problem: in onchain credit markets, vault curators need to verify private data from asset issuers (loan compositions, reserve states, risk signals). Today, each curator-issuer pair requires bilateral NDA negotiation, custom data formats, and manual delivery. That's N × N integrations. Hyve turns it into N + N: each issuer uploads once, every curator queries through Hyve.

---

## 2. Core Concepts (Data Model)

### 2.1 Vault

A **vault** is a logical container for a dataset. It is created and owned by a Data Owner. A vault contains:

- **Encrypted data**: the actual private data, stored encrypted at rest. Could be a loan tape, a reserve composition, a transaction ledger, fund NAV data, or any structured financial dataset.
- **Schema**: the column structure of the data — column names, types, and privacy rules. The schema is public metadata visible to consumers.
- **Privacy posture**: per-column rules governing what queries are permitted (see 2.2).
- **Metadata**: creation timestamp, last update timestamp, data source identifier, encryption method, hash of the original dataset (for integrity verification).

Visual metaphor: think of a vault as a locked glass safe. You can see the shape of what's inside (the schema) but not the contents (the data). You can ask the vault to answer questions (queries) and it will hand you a signed answer through a slot — but the door never opens.

A vault has a **status**: `active`, `paused`, `archived`. The data owner can pause a vault to temporarily halt all queries without deleting data.

### 2.2 Privacy Posture

Each column in a vault's schema has a privacy level. These are the rules that govern what a consumer's query is allowed to do with that column:

| Level       | Meaning                        | What queries can do                                                                              |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `private`   | Fully encrypted, not queryable | Cannot appear in any query clause. Invisible to consumers.                                       |
| `join`      | Join key only                  | Can be used in JOIN conditions to match records across vaults. Individual values never returned. |
| `aggregate` | Aggregation only               | Can appear inside SUM(), AVG(), COUNT(), MIN(), MAX(). Individual row values never returned.     |
| `dimension` | Grouping and filtering         | Can appear in GROUP BY and WHERE clauses. Individual values visible only in aggregated context.  |
| `select`    | Fully queryable                | Can be selected and returned in query results. Least restrictive.                                |

The privacy posture is committed as part of the vault's immutable metadata. If a data owner changes the posture, the change is logged, timestamped, and visible in the data lineage. Consumers can verify that the posture at query time matched what they expected.

### 2.3 Query

A **query** is a SQL statement constructed by a data consumer against a vault's schema. Queries are validated against the vault's privacy posture BEFORE execution — if a query violates the posture (e.g., tries to SELECT a column marked `aggregate`), it is rejected with a clear error explaining which rule was violated.

Query lifecycle:

1. **Draft**: consumer writes query in the query builder. Schema autocomplete and privacy posture validation happen in real-time.
2. **Proposed**: consumer submits the query as a proposal to the data owner. The proposal includes: the SQL, the target vault, the consumer's identity, and a purpose statement.
3. **Approved / Rejected**: the data owner reviews and approves or rejects. Approval can be automatic (if the data owner has set auto-approve rules for queries matching certain patterns) or manual.
4. **Executing**: the approved query runs inside the TEE. Data is decrypted in the enclave, query executes, result is computed.
5. **Completed**: the result + attestation are delivered to the consumer. The attestation is a cryptographic proof that the query ran correctly on the correct data inside a genuine TEE.
6. **Published** (optional): the data owner or consumer can choose to publish the attestation publicly.

### 2.4 Attestation

An **attestation** is the cryptographic output of a verified computation. It contains:

- **Query fingerprint**: a hash of the SQL that was executed (not the full SQL — that might reveal the consumer's methodology).
- **Vault identifier**: which vault was queried.
- **Timestamp**: when the computation ran.
- **Result summary**: either the full result (if the data owner permits) or a hash of the result.
- **TEE certificate**: proof that the computation ran inside a genuine, untampered enclave.
- **Data integrity hash**: proof that the data at query time matched the data as originally ingested (no tampering between ingestion and query).

Attestations can be:

- **Private**: only visible to the consumer who ran the query.
- **Public**: published to the public attestation feed, visible to anyone without authentication. The data owner controls this.

### 2.5 Data Lineage

Every action on a vault — data upload, schema change, privacy posture modification, query execution, attestation publication — is logged in an immutable lineage trail. This lineage is visualized as a timeline and is available to the data owner and (partially) to consumers who have queried the vault.

---

## 3. User Types

There are three distinct user types. The platform serves all three through a unified interface, but the experience adapts based on role.

### 3.1 Data Owner (Issuer / Originator)

**Who they are**: A tokenized credit fund (Apollo ACRED), a yield-bearing stablecoin issuer (Ethena), a lending originator (FalconX), or any entity that holds private financial data and wants to make it verifiable without exposing it.

**What they do on the platform**:

- Create vaults and upload encrypted datasets
- Define schemas and privacy postures per column
- Review and approve/reject incoming query proposals
- Monitor which queries are running and what attestations are being produced
- Choose which attestations to publish publicly
- View data lineage and audit trail

**Their primary concern**: control. They need to know exactly what can be queried, by whom, and what results are leaving the system. The UI must make control feel effortless and transparent — not buried in settings.

**Dashboard priorities**:

1. Incoming query proposals (actionable — approve/reject)
2. Vault health overview (active vaults, data freshness, last query)
3. Published attestations (what's public, what's private)
4. Data lineage (timeline of all actions)

### 3.2 Data Consumer (Curator / Allocator)

**Who they are**: A Morpho vault curator (Gauntlet, Steakhouse), a DeFi allocator (Infinify), a risk assessor, or any entity that needs to verify private data to make allocation or risk decisions.

**What they do on the platform**:

- Browse available vaults and their schemas
- Construct SQL queries using a schema-aware query builder
- Submit query proposals to data owners
- Receive attested results
- Optionally publish attestations from their side

**Their primary concern**: speed and analytical power. They want to write a query, get it approved, and receive verified results as fast as possible. The query builder should feel like a professional analytics tool — syntax highlighting, autocomplete, schema reference panel, privacy posture indicators inline.

**Dashboard priorities**:

1. Available vaults to query (browsable catalog with schema previews)
2. Active proposals (pending approval, recently completed)
3. Query results with attestation status
4. Query history and saved queries

### 3.3 Public Verifier (Community / Observer)

**Who they are**: Anyone — an LP checking if a fund they're invested in has been verified, a protocol evaluating whether to accept an asset as collateral, a journalist researching data transparency, or a curious community member.

**What they do on the platform**:

- Browse the public attestation feed (no login required)
- View attestation details: which vault, when, what was verified, the TEE certificate
- Verify the cryptographic proof independently (click to verify)
- See which assets carry Hyve attestation and how frequently they're re-verified
- Cannot see raw data, query logic, or private attestations

**Their primary concern**: trust and discoverability. They want to see at a glance which assets are verified, how recently, and whether the proof checks out. The interface should feel like a public good — clean, transparent, authoritative.

**Interface priorities**:

1. Live attestation feed (most recent first)
2. Search/filter by asset, issuer, verifier, time range
3. Attestation detail page with proof verification
4. "Verified" badge system — visual indicator of attestation freshness

---

## 4. Platform Structure (Pages)

### 4.0 Global Navigation

The navigation adapts based on authentication state:

**Not authenticated:**

- Logo (links to landing/public feed)
- Explore (public attestation feed)
- How it works
- Docs (link to documentation)
- Login / Sign up

**Authenticated (Data Owner):**

- Logo
- Dashboard
- Vaults (manage vaults)
- Proposals (incoming query proposals)
- Attestations (manage publications)
- Explore (public feed)
- Profile / Settings

**Authenticated (Data Consumer):**

- Logo
- Dashboard
- Explore Vaults (browse available data)
- Query Builder
- My Queries (history, results)
- Explore (public feed)
- Profile / Settings

A user can have BOTH roles (they might be a curator who also uploads their own data). The navigation should support role switching with a clear toggle or tab system — not two separate accounts.

### 4.1 Public Attestation Feed (Explore)

**URL**: `/explore`
**Auth required**: No

This is the Dune-like public surface. It's also the default landing for the app (not the marketing site — the marketing site is separate at the root domain; the app lives at `app.hyve.xyz` or similar).

**Layout**:

- **Header**: search bar (by asset name, vault ID, issuer) + filter controls (time range, asset type, verification type)
- **Main feed**: cards or rows showing recent attestations, most recent first
- **Each attestation card shows**:
  - Asset/vault name
  - Issuer name (if disclosed)
  - Verification type (NAV, reserves, concentration, custom)
  - Timestamp
  - Freshness indicator (green: <24h, yellow: 1-7d, red: >7d, grey: never re-verified)
  - "Verify proof" button (opens cryptographic verification)
- **Sidebar or top stats**: total attestations, total active vaults, total verified assets, volume of data verified (aggregate)

The feed should feel ALIVE — new attestations appearing, timestamps ticking, freshness indicators updating. This is the heartbeat of the platform. A static feed signals a dead product.

### 4.2 Attestation Detail Page

**URL**: `/attestation/:id`
**Auth required**: No

Shows full details of a single public attestation:

- Vault name and identifier
- Issuer (if disclosed)
- Query type description (e.g., "NAV verification", "Reserve composition check")
- Timestamp of execution
- Result summary (if the owner published it — e.g., "NAV within 1.2% of reported")
- TEE certificate details (enclave type, attestation hash)
- Data integrity verification (hash match between ingested data and data at query time)
- **"Verify Proof" action**: a button that runs client-side verification of the attestation against the TEE certificate chain. Shows a clear PASS/FAIL result.
- Lineage snippet: when was this vault created, how many times has it been queried, how often are attestations published

### 4.3 Data Owner Dashboard

**URL**: `/dashboard` (when role = owner)
**Auth required**: Yes

The owner's home screen. Purpose: at a glance, understand the state of all your vaults and what needs your attention.

**Layout**:

- **Action items bar** (top, prominent): "3 pending query proposals", "1 vault needs data refresh" — anything requiring immediate attention
- **Vault grid**: cards for each vault showing name, status (active/paused), schema column count, last data update, number of approved consumers, recent query count
- **Activity timeline** (right sidebar or below): chronological log of recent events — queries executed, proposals received, attestations published
- **Quick stats**: total queries this month, total attestations published, number of active consumers

Clicking a vault card opens the vault detail page.

### 4.4 Vault Management (Data Owner)

**URL**: `/vault/:id`
**Auth required**: Yes (owner only)

The central management interface for a single vault.

**Tabs**:

**Tab 1 — Overview**: vault metadata, status toggle (active/paused), data freshness indicator, creation date, last ingestion timestamp.

**Tab 2 — Schema & Privacy**: the full schema displayed as a table. Each row is a column in the dataset. Columns in the table:

- Column name
- Data type
- Privacy level (dropdown: private / join / aggregate / dimension / select)
- Description (optional, entered by owner)

The privacy level selector should be visually distinctive — use color coding:

- `private`: red/locked icon
- `join`: orange/link icon
- `aggregate`: yellow/sigma icon
- `dimension`: blue/filter icon
- `select`: green/open icon

Changes to privacy posture should require explicit confirmation ("You are changing 'loan_amount' from aggregate to select. This will allow consumers to see individual loan amounts in query results. Confirm?").

**Tab 3 — Proposals**: list of incoming query proposals from consumers. Each shows:

- Consumer name/identifier
- The SQL query (syntax highlighted)
- Purpose statement
- Privacy posture compliance check (pass/fail, with details if fail)
- Approve / Reject buttons
- Option to set auto-approve rules

**Tab 4 — Attestations**: list of all attestations generated from this vault. Each shows timestamp, consumer, query type, result summary, and a toggle for public/private visibility.

**Tab 5 — Lineage**: visual timeline of all vault events — data ingestion, schema changes, privacy posture changes, queries, attestations. This should be a vertical timeline with event icons and expandable details.

### 4.5 Vault Browser (Data Consumer)

**URL**: `/vaults`
**Auth required**: Yes (consumer)

A browsable catalog of all vaults the consumer has access to or can request access to.

**Layout**:

- **Search and filter bar**: by asset type, issuer, schema keyword, privacy level availability
- **Vault cards**: each card shows:
  - Vault name
  - Issuer name
  - Asset type (credit fund, stablecoin reserves, loan tape, etc.)
  - Number of queryable columns (non-private)
  - Data freshness (last update)
  - Number of public attestations
  - "Open schema" action → opens schema preview modal
  - "New query" action → opens query builder with this vault pre-selected

### 4.6 Query Builder (Data Consumer)

**URL**: `/query/new` or `/query/:id`
**Auth required**: Yes (consumer)

This is the power tool. It should feel like a professional SQL editor — similar to BigQuery console, Snowflake worksheet, or Dune's query editor.

**Layout — three panel**:

**Left panel — Schema reference**:

- Tree view of selected vault's schema
- Each column shows name, type, and privacy level (with color-coded icon)
- Click a column to insert it into the query
- Columns marked `private` are greyed out and unclickable
- Hover over a column shows its description and privacy constraints

**Center panel — Query editor**:

- SQL editor with syntax highlighting, autocomplete, and line numbers
- Autocomplete is schema-aware: suggests column names, functions, and validates privacy constraints in real time
- Inline warnings: if the query would violate a privacy constraint, highlight the offending clause in red with a tooltip explaining the violation (e.g., "Cannot SELECT 'borrower_name' — column is marked 'aggregate' only")
- Below the editor: vault selector (dropdown, shows current vault), purpose statement field (text, required for proposal submission)
- Action buttons: "Validate" (checks privacy compliance without submitting), "Submit Proposal" (sends to data owner for approval)

**Right panel — Results / Status**:

- Before submission: empty state with guidance text
- After submission: proposal status tracker (submitted → pending owner review → approved → executing → completed)
- After completion: results displayed as a table, plus attestation details, plus a "Publish attestation" toggle

### 4.7 Query Results (Data Consumer)

**URL**: `/query/:id/results`
**Auth required**: Yes (consumer)

Detailed view of a completed query:

- The SQL that was executed (syntax highlighted)
- The vault it ran against
- Execution timestamp
- Result table (interactive, sortable)
- Attestation panel:
  - TEE certificate hash
  - Data integrity verification
  - "Verify proof" button
  - "Download attestation" (JSON)
  - "Publish to feed" toggle (publishes to public attestation feed)

---

## 5. Design System

### 5.1 Aesthetic Direction

**Tone**: Institutional trust meets technical precision. This is financial infrastructure used by Gauntlet, Steakhouse, Wintermute — professional risk managers allocating billions. The design should feel like a Bloomberg terminal married to Stripe's dashboard: authoritative, data-dense, and calm.

**NOT**: dark-mode neon DeFi (no purple gradients, no floating particles, no "gm" energy). This is not a DEX. This is not a protocol landing page. This is a tool for professionals who manage other people's money.

**YES**: clean light mode as default (dark mode optional), sharp typography, deliberate use of whitespace, data-forward layouts, subtle depth through shadows and borders, color used for meaning not decoration.

### 5.2 Color Palette

Use color to encode MEANING, particularly for privacy levels and status states.

**Primary**: a deep, trust-conveying blue-grey (#1a2332 or similar) for primary text and key UI elements.
**Accent**: a single sharp accent color (consider a sophisticated teal, slate blue, or muted emerald — NOT neon, NOT purple) for CTAs, active states, and highlights.
**Background**: warm white (#fafafa or #f8f9fa) as canvas. Pure white (#ffffff) for cards and elevated surfaces.

**Privacy level colors** (used consistently across schema displays, query builder, vault cards):

- `private`: deep red / locked (#c0392b)
- `join`: warm amber (#e67e22)
- `aggregate`: golden yellow (#f39c12)
- `dimension`: calm blue (#2980b9)
- `select`: confident green (#27ae60)

**Status colors**:

- Active / Verified / Approved: green
- Pending / Processing: amber/yellow
- Paused / Rejected: red
- Archived / Inactive: grey

**Attestation freshness** (used on public feed and vault cards):

- Fresh (<24h): green dot
- Recent (1-7d): yellow dot
- Stale (>7d): red dot
- Never re-verified: grey dot

### 5.3 Typography

Choose ONE distinctive display font for headings that signals precision and authority (consider: DM Sans, Satoshi, General Sans, Geist, or something with character — NOT Inter, NOT Roboto, NOT system fonts). Pair with a highly readable body font for data-dense contexts.

Headings should be bold and have clear hierarchy. Body text should optimize for readability at small sizes, since the query builder and schema tables will have dense information.

Monospace font for code/SQL: use JetBrains Mono, Fira Code, or similar — syntax highlighting is critical for the query builder.

### 5.4 Component Patterns

**Cards**: used for vaults, attestations, proposals. Slightly elevated with subtle shadow. Clear visual hierarchy: title → key stats → action buttons. Hover state: slight elevation increase + accent border on left edge.

**Tables**: used for schemas, query results, lineage logs. Clean borders, alternating row backgrounds, sticky headers. Columns should be resizable. Dense but not cramped — at least 40px row height.

**Status badges**: pill-shaped, color-coded. Used for vault status, proposal status, attestation freshness. Always include both color AND text label (accessibility).

**Modals**: used for confirmations (privacy posture changes, query submission). Centered, dimmed backdrop, clear action buttons. Never for content that needs scrolling — use full pages instead.

**Toast notifications**: used for async events (query completed, proposal received, attestation published). Slide in from top-right, auto-dismiss after 5s, action button for navigation.

### 5.5 Animations & Transitions

**Keep motion purposeful.** This is a financial tool, not a showcase.

- Page transitions: subtle fade (200ms)
- Card hover: smooth elevation change (150ms ease-out)
- Status changes: color transitions (300ms)
- Query execution: a subtle progress indicator (pulsing dot or thin progress bar) — NOT a spinner. Spinners feel like loading. A progress indicator feels like the system is working.
- Attestation publication: a brief "confirmed" animation (checkmark drawing itself) when an attestation goes public. This is the ONE moment of delight — it's the "signature" moment of the platform.
- Live feed: new attestations slide in from top with a gentle entrance (250ms). No jarring repositioning.

### 5.6 Responsive Behavior

The primary use case is desktop (1280px+). The query builder and schema tables are power-user tools that need screen real estate.

For tablet (768-1279px): collapse the three-panel query builder into two panels (schema reference becomes a collapsible sidebar). Vault cards switch from grid to list.

For mobile (< 768px): the public attestation feed and attestation detail pages should be fully responsive. The query builder and vault management are not — show a "best experienced on desktop" message. The public feed is the mobile entry point for verification and discovery.

---

## 6. Interaction Details

### 6.1 Data Upload Flow (Data Owner)

1. Owner clicks "Create Vault" from dashboard
2. Step 1: Name the vault, select asset type (credit fund, stablecoin reserves, loan tape, other)
3. Step 2: Upload data. Supported formats: CSV, Parquet, JSON. File is encrypted client-side before upload. A progress indicator shows encryption + upload stages separately.
4. Step 3: Schema is auto-detected from the file. Owner reviews and edits column names, types, descriptions.
5. Step 4: Set privacy posture for each column. Visual table with dropdowns. Color coding appears in real-time as the owner selects levels. A summary at the bottom shows: "X columns private, Y aggregation-only, Z fully queryable."
6. Step 5: Review and confirm. Summary card shows vault name, column count, privacy summary, and a preview of what consumers will see (the schema without the actual data).
7. Vault goes live. Owner is redirected to the vault detail page.

### 6.2 Query Submission Flow (Data Consumer)

1. Consumer browses vault catalog or clicks "New Query" from a specific vault
2. Query builder opens with the vault's schema loaded in the left panel
3. Consumer writes SQL in the editor. Autocomplete suggests columns. Privacy violations are flagged inline in real-time.
4. Consumer clicks "Validate" — system checks the full query against the privacy posture. Returns either "Query valid — all privacy constraints satisfied" (green) or a specific list of violations (red).
5. Consumer fills in purpose statement (required, free text)
6. Consumer clicks "Submit Proposal"
7. Proposal appears in both the consumer's "My Queries" (status: pending) and the data owner's "Proposals" tab
8. When approved and executed, the consumer receives a notification. Results and attestation are available in the results panel.

### 6.3 Attestation Publication Flow

1. After a query completes, the owner sees the attestation in their Attestations tab
2. A toggle switches the attestation from "Private" to "Public"
3. A confirmation modal shows: "This attestation will be visible on the public feed. It will show [vault name], [timestamp], and [result summary]. It will NOT show the SQL query or raw data. Confirm?"
4. On confirmation, the attestation appears on the public feed with the "confirmed" checkmark animation
5. The attestation gets a permalink URL that can be shared externally

---

## 7. Empty States & Onboarding

Every page should have a purposeful empty state that guides the user to their first action — not a blank screen.

**Data Owner — first visit, no vaults**:
"Welcome to Hyve. Create your first vault to start making your data verifiable without exposing it."
→ Big CTA: "Create Vault" with a brief description of what happens.

**Data Consumer — first visit, no queries**:
"Welcome to Hyve. Browse available vaults and run your first verified query."
→ Two paths: "Explore Vaults" (browse the catalog) or "View Public Feed" (see what's being verified).

**Public Feed — no attestations yet**:
"The verification feed is starting. The first attestations will appear here as data owners publish verified computations."
→ CTA: "Want to be verified? Create a vault." / "Want to verify? Request consumer access."

---

## 8. Key Principles for AI Implementers

When generating code for this platform, follow these principles:

1. **Privacy level colors are sacred.** The five-color system (red/amber/yellow/blue/green for private/join/aggregate/dimension/select) must be used consistently everywhere — schema tables, query builder, vault cards, detail pages. Never use these colors for other meanings.

2. **Status badges always show color + text.** Never rely on color alone. Accessibility matters.

3. **The query builder is the most complex component.** It needs: syntax-highlighted SQL editor, real-time privacy posture validation, schema-aware autocomplete, three-panel layout. Get this right and the rest follows.

4. **The public attestation feed is the most important page for growth.** It must feel alive, authoritative, and trustworthy. New attestations appear smoothly. Freshness indicators are visible at a glance. The "Verify Proof" button is prominent.

5. **Don't expose internal terminology to users.** Never show "H3" or "Hyve Ground" or "TEE" or "enclave" in the UI. Use plain language: "encrypted storage", "verified computation", "cryptographic proof." The technical details belong in the docs, not the interface.

6. **Control is the data owner's primary emotion.** Every screen for the data owner should reinforce that they are in control of their data. Privacy posture is front and center. Approval flows are explicit. Nothing happens without their knowledge.

7. **Speed is the data consumer's primary emotion.** Every screen for the consumer should minimize friction between "I have a question about this data" and "I have a verified answer." The query builder should feel fast and responsive.

8. **Trust is the public verifier's primary emotion.** The public feed should feel like a public good — transparent, open, verifiable. The "Verify Proof" action should be one click with a clear pass/fail result.
