---
name: using-hyve
description: Use when starting any conversation in the Hyve frontend repo — orients you to the project's subagents, skills, and non-negotiable workflows so the right specialist is dispatched and the right discipline is applied before code is written.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill — your parent already routed you here.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
This is the Hyve frontend. Two things will get you in trouble fastest:

1. **Building the wrong product.** Hyve is operator tooling for fund originators configuring/monitoring private data pipelines. It is NOT an analytics dashboard, intelligence platform, or oracle UI. If a screen invites a human to read, interpret, or analyze data, you are building the wrong thing. See the "Product Test" below.
2. **One-shotting UI bugs.** Visual problems require the iterative screenshot loop. The Stop hook will block completion until a Playwright screenshot proves the fix. Do not try to skip it.

Everything else is recoverable. These two are not.
</EXTREMELY-IMPORTANT>

## The Product Test

Before designing or accepting any screen, ask:

> Would a fund operator (Securitize Fund Services, Maple Trade Finance BD, a CLO admin) use this to **configure** or **monitor** their data pipeline?

- **Yes** → keep it.
- **It invites them to read, analyze, or interpret data** → remove it.

Closest analogs to draw from: **Plaid** (scoped consent, structured output reports, one-click revoke), **Pyth Network** (first-party signed data, on-chain consumers), **Axoni / HYDRA** (multi-party private capital markets sync).

NOT analogs: 9fin / AlphaSense / Hebbia / Rogo (intelligence platforms), Allvue / SS&C Advent (internal fund admin), DTCC (clearing — redundant on-chain).

Full product spec: `docs/product/hyve_originator_context.md`.

## Subagent Routing — Pick the Right Specialist

These auto-trigger by description; you usually don't name them explicitly. But you should know the map so you can confirm the right one was picked.

### UI work
- **`ui-component-dev`** — build or modify components (`.tsx` in `src/components/` or `src/app/`). Has Playwright. Default for any new UI.
- **`ui-design-reviewer`** — visual review with mandatory Playwright screenshot. Runs after every UI change.
- **`design-system`** — design tokens, theme variables, `tailwind.config`, `src/components/ui/` primitives. Use before adding a one-off color/size.
- **`accessibility-auditor`** — keyboard nav, ARIA, WCAG 2.2 AA verification on any interactive widget. Has Playwright.

### App structure
- **`routing-nav`** — `src/app/` routing, layouts, `loading.tsx`, `error.tsx`, middleware, redirects.
- **`state-management`** — `useState`/`useReducer`/Context decisions, form state, refactoring prop drilling.
- **`api-integration`** — anything touching `src/lib/api/`, Server Actions, SWR, Rust backend calls, Zod response schemas.

### Quality gates
- **`code-reviewer`** — after writing or modifying code, before commits. Read-only.
- **`security-reviewer`** — auth, authz, user input, env vars, anything touching sensitive data. Read-only.
- **`performance-optimizer`** — Core Web Vitals, bundle size, slow pages, heavy imports, large lists. Has Playwright.
- **`unit-tester`** — Vitest + RTL for utilities, hooks, components.
- **`e2e-tester`** — Playwright user journeys across pages.

### Infra & docs
- **`build-deploy`** — `next.config`, Vercel config, env vars, CI workflows, build errors.
- **`docs-writer`** — README, CLAUDE.md updates, ADRs, JSDoc.

### When in doubt
If multiple agents could fit, prefer the one whose description mentions the file path or task type you're touching. If still unclear, use the parent `general-purpose` and explain why no specialist fit — that's a signal a new agent may be needed.

**You usually shouldn't pick the agent yourself.** Invoke `hyve-driven-development` and let its routing table do it. This skill (`using-hyve`) tells you *what each agent is*; `hyve-driven-development` is *how you actually use them*.

## Project Skills — Reach For These Before Defaults

These live in `.claude/skills/` and override generic LLM behavior:

### Hyve-specific rituals
- **`hyve-driven-development`** 🔴 — **the execution skill.** For any non-trivial change, this routes the task to the correct specialist agent (one of the 13 in `.claude/agents/`), runs the mandatory paired reviewers (`ui-design-reviewer` after UI, `security-reviewer` after api work, `accessibility-auditor` for interactive widgets), and injects the Hyve guardrails (Product Test, no `any`, RSC default, Zod validation, design tokens) into every implementer prompt. Use whenever you'd otherwise be tempted to write code in the main session.
- **`visual-fix`** 🔴 — the screenshot-fix-screenshot loop for any UI bug. **Mandatory** whenever the user reports a visual problem or pastes a broken screenshot. The Stop hook in `.claude/settings.json` enforces this — completion is blocked until verified. Invoked automatically by `hyve-driven-development` for any UI change.

### Frontend craft
- **`frontend-design`** — distinctive, production-grade interfaces; anti-AI-slop.
- **`web-design-guidelines`** — 100+ a11y/UX rules.
- **`design-taste-frontend`** — strict component architecture, hardware-accel CSS, metric-based rules.
- **`minimalist-ui`** — editorial style, warm monochrome, no gradients/heavy shadows.
- **`redesign-existing-projects`** — when upgrading existing screens to premium quality.

### Framework
- **`next-best-practices`** — App Router, RSC boundaries, async APIs, route handlers, metadata. **Read this before writing any `.tsx` server/client boundary** — this Next.js has breaking changes from training data (see `AGENTS.md`).
- **`vercel-react-best-practices`** — 62 perf/correctness rules for React 19+.
- **`vercel-composition-patterns`** — compound components, render props, context. Use when you spot boolean-prop proliferation.
- **`typescript-advanced-types`** — generics, conditional/mapped/template-literal types.
- **`shadcn`** — adding/composing shadcn components in `src/components/ui/`.

### Testing
- **`webapp-testing`** — Playwright for verifying frontend, capturing screenshots, viewing browser logs.

## Non-Negotiable Workflows

These come from `CLAUDE.md` and `AGENTS.md` — they override default behavior.

1. **Visual loop for UI bugs.** Never one-shot a CSS/layout/spacing/shadow/alignment fix. Always: screenshot → identify → plan → implement → verify with `ui-design-reviewer`'s fresh screenshot → loop until VERIFIED. Announce iteration number in conversation.
2. **Server Components by default.** Add `"use client"` only when the component needs interactivity, browser APIs, or hooks. Justify every `"use client"` in your head before typing it.
3. **No `any` types.** Use `unknown` and narrow. TypeScript strict mode is on.
4. **Validate API responses.** All Rust-backend responses go through Zod schemas in `src/lib/api/schemas.ts`. Don't trust the network.
5. **No hardcoded colors / spacing / type.** Always design tokens (OKLCH palette, primary accent forest green `oklch(0.40 0.10 160)`).
6. **Server-side authorization.** Never trust client-side checks for anything sensitive.
7. **Named exports only** (except `page.tsx` / `layout.tsx`).
8. **Read the breaking-changes notice in `AGENTS.md`.** This Next.js may differ from your training data — check `node_modules/next/dist/docs/` before writing new conventions.

## Workflow Combinations That Work Well

- **New feature, non-trivial:** `superpowers:brainstorming` → `superpowers:writing-plans` → **`hyve-driven-development`** (handles dispatch + reviewers + guardrails).
- **Executing a plan that's already written:** **`hyve-driven-development`** — it owns the per-task routing, reviewer pairings, and visual-fix loop.
- **UI bug from user screenshot:** invoke `visual-fix` immediately — it owns the entire loop.
- **Backend integration:** route through `hyve-driven-development` so `api-integration` builds it → `security-reviewer` audits it → `unit-tester` covers it (in that order, automatically).
- **New design primitive:** route through `hyve-driven-development` so `design-system` lands the token first → `ui-component-dev` consumes it → `accessibility-auditor` verifies.
- **Stuck debugging:** `superpowers:systematic-debugging` before proposing fixes — don't guess.

## Red Flags Specific to Hyve

These thoughts mean STOP:

| Thought | Reality |
|---------|---------|
| "Let me add a chart showing NAV trend" | This is operator tooling, not analytics. Verify with the Product Test. |
| "I'll add AI insights / commentary / analyst notes" | Wrong product. Hyve is plumbing, not interpretation. |
| "I'll just inline this color, it's just for one spot" | Use design tokens. One-off colors compound. |
| "I'll skip the Playwright screenshot, the CSS change is trivial" | The Stop hook will block you. The screenshot is the verification — there is no skipping it. |
| "I'll cast this to `any` to get past the type error" | Use `unknown` and narrow. This is non-negotiable. |
| "I'll add `'use client'` to the layout to fix this hook error" | Almost always the wrong fix. Find the leaf that actually needs interactivity. |
| "Next.js docs from my training say to do X" | This Next.js has breaking changes. Read `node_modules/next/dist/docs/` first. |

## Where to Find More

- **Product spec** — `docs/product/hyve_originator_context.md`
- **Project rules** — `CLAUDE.md`, `AGENTS.md`
- **Agent definitions** — `.claude/agents/*.md`
- **Skill catalog** — `.claude/skills/*/SKILL.md`
- **ADRs** — `docs/architecture/`
