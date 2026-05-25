@AGENTS.md

# Hyve — Frontend

A Next.js operator console for verified private data infrastructure on tokenized RWAs. Configuration and monitoring tooling for fund originators (Securitize, Maple, fund admins) who make their private fund data programmable for counterparties whose automated systems — smart contracts, risk engines, compliance systems — act on it.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **UI Library:** shadcn/ui (owned in src/components/ui/, New York style)
- **Styling:** Tailwind CSS + CSS variables (OKLCH palette)
- **Fonts:** Instrument Serif (display) + Geist Sans (UI) + Geist Mono (data/code)
- **Primary accent:** Forest green `oklch(0.40 0.10 160)`
- **Forms:** React Hook Form + Zod
- **State:** React (useState/useReducer; Context for feature subtrees)
- **Data fetching:** SWR (client) + native fetch (server)
- **Backend:** Rust API at `process.env.RUST_API_URL` (out of scope for this repo)
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Browser automation:** Playwright MCP (for agent visual feedback)
- **Deployment:** Vercel

## Product context — what you are building

Hyve is a unified platform with three actors who share one sidebar shell:

- **Data owner / originator** — uploads private datasets, defines schemas and per-column privacy posture, approves curator Analyses, controls publication.
- **Curator** — browses vaults, authors SQL Analyses against schemas, proposes them to owners, receives attested results, configures downstream delivery (oracle / webhook / API / visualization).
- **Public verifier** — anyone, no account. Browses the public attestation feed, opens attestation detail pages, verifies cryptographic proofs independently. The Dune-like public surface.

A single account can hold multiple roles (owner + curator). The shell adapts via additive nav items, never via mode toggle. Anonymous visitors see the same sidebar shell with auth-gated items shown disabled, not hidden.

**This is NOT:**

- Not an intelligence platform (no 9fin, AlphaSense, Hebbia, Rogo patterns — no news, commentary, AI insights, analyst notes)
- Not an oracle itself, though oracle-adjacent — Hyve hosts signed attestations as a public good, and the curator's Oracle output tab pushes attestations onchain. The platform doesn't sign values onchain itself; it produces what gets signed.
- Not an analytics dashboard (no historical NAV charts, IRR trend lines, performance graphs, scenario analysis, risk analytics)
- Not a fund admin tool (Allvue, SS&C Advent are internal ops; Hyve is the cross-org data programming layer)
- Not a tokenization platform (Securitize tokenizes; Hyve makes the data behind tokenized assets programmable)

**Closest user-perspective analogs to draw from:**

- **Plaid** — institutional version of consumer bank data → lender's underwriting engine. Steal the scoped consent copy, structured output reports, one-click revoke patterns.
- **Pyth Network** — first-party data publishers sign their own data; smart contracts consume automatically. Same model on-chain, but for private fund data.
- **Axoni / HYDRA** — multi-party private capital markets data sync between institutional counterparties.
- **Not DTCC** — clearing service; clearing is redundant in crypto due to atomic settlement.

**The single test for any screen:** would a fund operator (Securitize Fund Services, Maple Trade Finance BD, a CLO admin) use this to configure or monitor their data pipeline? If yes, keep it. If it invites them to read, analyze, or interpret data, remove it.

For the full product spec including navigation structure, the Overview page DAG, source/dataset/schema/rules/consumers/counterparties layout, and the canonical ACRED example, see `docs/product/hyve_originator_context.md`.

## Project Structure

- `src/app/` — Next.js routes (App Router)
- `src/components/ui/` — Design system primitives (shadcn-based)
- `src/components/features/` — Feature-specific components
- `src/lib/api/` — API client for Rust backend
- `src/lib/utils/` — Pure utility functions
- `src/lib/hooks/` — Reusable React hooks
- `src/lib/validations/` — Zod schemas
- `src/types/` — Shared TypeScript types
- `tests/e2e/` — Playwright E2E tests
- `docs/architecture/` — ADRs and architecture docs

## Universal Rules

- TypeScript strict mode — never use `any`, prefer `unknown`
- Server Components by default — add `"use client"` only when needed
- Named exports only (except pages/layouts)
- shadcn components live in src/components/ui/, customized via CSS variables
- No hardcoded colors — always use design tokens
- App Router only (no Pages Router)
- Conventional Commits

## Visual Language

The codebase enforces a strict typographic visual language. Information is conveyed through type weight + a constrained color palette, never through chrome (no pills, no dots, no chips, no eyebrow labels).

Single source of truth: `.claude/rules/visual-language.md`.

Any UI change is reviewed by `ui-design-reviewer` against the visual language checklist. Build fails on banned imports (`status-pill`, `privacy-chip`) and flags banned inline patterns (eyebrow text, decorative dots) via ESLint.

Skill: `.claude/skills/hyve-visual-language/SKILL.md` — invoke when adding a new primitive, refactoring banned chrome, or resolving spec-vs-rules conflicts.

## Common Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E tests
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check
```

## ⚠️ How to Fix UI Bugs (READ THIS BEFORE TOUCHING UI)

When the user reports a visual problem (spacing, padding, shadow, layout, broken chart, alignment, "looks weird", etc.) — or pastes a screenshot of broken UI — you MUST follow the iterative visual loop.

**Do NOT one-shot UI fixes.** They never work.

The loop:

1. **Screenshot the broken state** (Playwright MCP, route the user is on)
2. **Identify the bug visually** (compare screenshot to user's report and design intent)
3. **Plan the fix** (root cause, not symptoms)
4. **Implement** (`ui-component-dev` agent)
5. **Verify** (`ui-design-reviewer` agent takes fresh screenshot, judges fix)
6. **Loop until VERIFIED** — repeat steps 2–5 with the new screenshot as the new "broken state"

This is enforced by:

- The `visual-fix` skill in `.claude/skills/visual-fix/`
- The `Stop` hook in `.claude/settings.json` which blocks completion until visual verification

**You cannot claim "done" on a UI fix without a Playwright screenshot proving the rendered output is correct.** The Stop hook will force you to keep working if you try.

When following the loop, briefly state which iteration you're on so the user can see progress: "Iteration 2: shadow is gone but padding still off, continuing..."

## Backend Integration

- API base: `process.env.RUST_API_URL`
- All API calls through `src/lib/api/client.ts`
- Zod schemas validate ALL responses (`src/lib/api/schemas.ts`)
- Server Components fetch directly; Client Components use SWR
- Mutations use Server Actions

## Agent Workflow

The `.claude/agents/` directory contains specialized agents that auto-trigger by description. You don't need to call them by name. The relevant ones for UI work:

- `ui-component-dev` — builds and modifies components, has Playwright access
- `ui-design-reviewer` — visual review with mandatory Playwright screenshot
- `accessibility-auditor` — keyboard nav and a11y verification (Playwright)
- `performance-optimizer` — real-browser profiling (Playwright)
- `e2e-tester` — Playwright E2E tests
- `repo-architect` — structure enforcement
- `code-reviewer`, `security-reviewer` — read-only review (no Playwright)
- `state-management`, `api-integration`, `routing-nav`, `design-system`, `unit-tester`, `build-deploy`, `docs-writer` — domain specialists

The Superpowers plugin handles orchestration: planning, parallel dispatching, code review workflow, TDD, debugging methodology.

## Skills in Use

**Workflow (Superpowers):** brainstorming, writing-plans, executing-plans, subagent-driven-development, dispatching-parallel-agents, requesting/receiving-code-review, systematic-debugging, test-driven-development, verification-before-completion, using-git-worktrees, finishing-a-development-branch, writing-skills

**Frontend craft:**

- `frontend-design` (Anthropic official)
- `vercel-react-best-practices` (62 rules)
- `vercel-composition-patterns`
- `web-design-guidelines` (100+ a11y/UX rules)
- `next-best-practices`
- `typescript-advanced-types`
- `webapp-testing`

**Project skills:**

- `visual-fix` — the screenshot-fix-screenshot loop for UI bugs
- `hyve-visual-language` — decision framework for new primitives, refactoring banned chrome, and spec-vs-rules conflicts
- `hyve-driven-development` — orchestrator that dispatches the right specialist + reviewers per file type

**Frontend craft additions:**

- `ui-ux-pro-max` — replaces the prior `ui-minimalist`. Color-palette catalog, font-pairing rules, density and interaction-state guidance. Required for every UI change.

## Non-Negotiable Rules

1. **Visual loop for UI bugs** — see "How to Fix UI Bugs" above
2. **Never expose secrets to client code** — audit NEXT*PUBLIC* vars
3. **Validate API responses** — use Zod, don't trust the network
4. **Server-side authorization** — never trust client-side checks
5. **Accessibility required** — WCAG 2.2 AA minimum
6. **Performance budget** — LCP <2.5s, INP <200ms, CLS <0.1
7. **No `any` types** — use `unknown` and narrow
8. **Strict typographic rule.** See `.claude/rules/visual-language.md`. Banned: decorative dots, eyebrow labels, status pills, privacy chips, code-comment style labels, glows, slide-in animations on lists, color as sole signal. Required: typographic primitives (`<Status>`, `<Timestamp>`, `<PrivacyLevel>`, `<Section>`, `<Disabled>`, `<ResourceCard>`). Every UI change must pass `ui-design-reviewer`.

## Architecture Principles

1. Feature-based organization — code that changes together stays together
2. Public API boundaries — features expose via index.ts
3. Dependency direction flows down — app → components → lib → types
4. Server Components by default — client only when interactive
5. Composition over configuration — compound components, not boolean props
6. Composition lives on top of typographic primitives, not on top of chrome primitives. Information through type weight + constrained color, never through fills, borders, or decorative shapes.
