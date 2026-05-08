@AGENTS.md

# Hyve Data Clean Room — Frontend

A Next.js dashboard for verifiable, confidential data collaboration on tokenized RWAs. AI-powered data engineering and analytics platform for risk curators, data engineers, and allocators.

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

## Non-Negotiable Rules

1. **Visual loop for UI bugs** — see "How to Fix UI Bugs" above
2. **Never expose secrets to client code** — audit NEXT*PUBLIC* vars
3. **Validate API responses** — use Zod, don't trust the network
4. **Server-side authorization** — never trust client-side checks
5. **Accessibility required** — WCAG 2.2 AA minimum
6. **Performance budget** — LCP <2.5s, INP <200ms, CLS <0.1
7. **No `any` types** — use `unknown` and narrow

## Architecture Principles

1. Feature-based organization — code that changes together stays together
2. Public API boundaries — features expose via index.ts
3. Dependency direction flows down — app → components → lib → types
4. Server Components by default — client only when interactive
5. Composition over configuration — compound components, not boolean props
