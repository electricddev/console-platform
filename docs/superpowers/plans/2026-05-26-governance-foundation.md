# Governance Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode the strict typographic visual language as enforceable rules across the agent system + ESLint, before any design system or feature work begins. After this plan ships, every UI agent operates under the new rules and the build flags banned patterns.

**Architecture:** Six interrelated artifacts created or updated. No application code, no React components. Pure governance: one new rules file (single source of truth), one new skill (complex enforcement), three agent updates, one orchestrator-skill update, two top-level docs (`CLAUDE.md` + `AGENTS.md`), and ESLint enforcement layered into the existing config. ESLint rules ship at `warn` severity initially — Plan 2 (design system foundation) promotes them to `error` after migrations. Files touching agent/skill/rules markdown are static config; verification is grep-based content checks. Files touching ESLint are real code; verification is fixture-based (write a violating snippet, run lint, expect the rule to fire).

**Tech Stack:** Markdown (rules, skills, agents, docs). ESLint flat-config (`eslint.config.mjs`) with `no-restricted-imports` and `no-restricted-syntax` core rules. No new dependencies required.

**Source spec:** `docs/superpowers/specs/2026-05-26-hyve-platform-design.md` (specifically §1, §8, and §Sequencing steps 1–6)

**Routing:** Per `.claude/skills/hyve-driven-development/SKILL.md`, the executing orchestrator should:
- Dispatch `docs-writer` for changes to `.claude/agents/*.md`, `.claude/skills/**`, `.claude/rules/**`, `CLAUDE.md`, `AGENTS.md`.
- Dispatch `build-deploy` for changes to `eslint.config.mjs`.
- Run no design or accessibility reviewers — this plan ships no rendered UI.

---

## Self-Verification Standard

Each task's verification step must produce observable output. Two patterns used in this plan:

**Pattern A — Markdown content check:**
```bash
grep -q "EXACT PHRASE" path/to/file.md && echo "PASS" || echo "FAIL"
```
Expected: `PASS`

**Pattern B — ESLint fixture check:**
Write a small `.tsx` file containing the banned pattern. Run `pnpm lint <fixture>`. Expected: lint reports the configured message (severity = warn). Then delete the fixture.

---

### Task 1: Create the visual language rules file

**Files:**
- Create: `.claude/rules/visual-language.md`

- [ ] **Step 1: Create the `.claude/rules/` directory**

Run:
```bash
mkdir -p .claude/rules
```

- [ ] **Step 2: Write `.claude/rules/visual-language.md`**

Full content:

````markdown
# Hyve Visual Language Rules

These rules are non-negotiable. Every UI agent must honor them. They are referenced by `.claude/agents/ui-component-dev.md`, `.claude/agents/ui-design-reviewer.md`, `.claude/agents/accessibility-auditor.md`, `CLAUDE.md`, and `AGENTS.md`.

Source: `docs/superpowers/specs/2026-05-26-hyve-platform-design.md` §1, §7, §8.

## The Strict Typographic Rule

Information is conveyed through type weight + a constrained color palette. Never through chrome.

- **Status** → colored verb in plain text. Never pills, never dots, never badges.
- **Privacy level** → colored word in plain text. Never chips.
- **Freshness** → relative timestamp tinted (≤24h muted green, 1–7d neutral, >7d muted red). Never dots.
- **Section grouping** → heading hierarchy + spacing. Never eyebrow labels (uppercase tracked text).

## Banned Patterns (fail review automatically)

1. **Decorative status dots** — `<span className="h-1 w-1 rounded-full bg-*" />` patterns.
2. **Eyebrow uppercase tracked labels** — `text-[10px] uppercase tracking-*` used as section ornament.
3. **Code-comment style UI labels** — `// section name`, `── divider ──`, or `[...]` brackets used as visible decorative text.
4. **Floating progress bars, signature pills, "done" glows** — animated chrome that exists to celebrate state changes.
5. **Pulsing dots, rotating spinners, shimmer skeletons** — replace with static skeletons or inline status text.
6. **Stock vector illustrations** — strongest "vibe-coded" tell. Custom Hyve artwork is fine, post-MVP.
7. **Slide-in animations on lists** — override `docs/spec.md` §5.5 with opacity-fade only.
8. **Color as the sole signal** — every colored state must have a text label adjacent.

## Required Primitives

When you need to signal a meaning, reach for the corresponding primitive. If the primitive doesn't exist for the case, stop and propose adding one — do not invent inline chrome.

| Signal | Primitive |
|---|---|
| State verb (Approved, Pending, Rejected) | `<Status tone="success\|warning\|danger\|info\|neutral">` |
| Freshness / relative time | `<Timestamp at={date} />` |
| Privacy level (private/join/aggregate/dimension/select) | `<PrivacyLevel level="..." />` |
| Section hierarchy | `<Section>` + native `<h2>` / `<h3>` |
| Sidebar item disabled for anon | `<Disabled>` |
| Home-page resource card | `<ResourceCard>` |

These primitives live at `src/components/ui/` and are introduced in Plan 2 (Design System Foundation). Plan 1 (this plan) only establishes the *rules* enforcing their use.

## Color Calibration

No hex value enters the codebase without a visual review pass via the `ui-ux-pro-max` skill catalog. Cheap-feeling colors invalidate every other discipline.

The calibration pass produces a concrete token map for:
- `--status-*` (success / warning / danger / info / neutral, each with a `-muted` variant)
- `--privacy-*` (private / join / aggregate / dimension / select)
- `--accent` (primary CTA + active state)
- Surface tokens (`--bg`, `--surface`)

## Motion Budget

**Allowed:**
- Opacity fade-in on new list content (≤200ms)
- Hover state changes (≤150ms ease-out)
- Collapse/expand of dropdowns and accordions (≤200ms)
- Output tab content switching (≤100ms)
- Native browser focus rings

**Banned:**
- Glows, pulses, shimmer
- Floating progress bars
- Spinners (use skeletons or status text)
- Slide-in animations on lists
- Checkmark draw-on animations
- `transform`-based motion that draws attention to itself

`prefers-reduced-motion: reduce` makes all 200ms fades instant.

## Accessibility Floor

WCAG 2.2 AA minimum (per `CLAUDE.md`).

- All interactive elements keyboard-navigable
- Visible native focus rings (no custom focus glow)
- Color is never the sole signal (already enforced by the typographic rule — status is colored *text*, not colored *fill*)
- ARIA labels on icon-only controls
- Form fields labeled (no placeholder-as-label)
- Skip-to-content link in shell
- Respect `prefers-reduced-motion`

## Review Enforcement

- `ui-design-reviewer` and `accessibility-auditor` run on every UI change.
- Build fails on banned imports (`status-pill`, `privacy-chip`) via ESLint `no-restricted-imports`.
- Build flags eyebrow + decorative-dot patterns via ESLint `no-restricted-syntax` (severity `warn` in Plan 1; promoted to `error` after Plan 2 migrations).
````

- [ ] **Step 3: Verify the file exists and contains key sections**

Run:
```bash
test -f .claude/rules/visual-language.md && echo "EXISTS" || echo "MISSING"
grep -q "The Strict Typographic Rule" .claude/rules/visual-language.md && echo "RULE_PRESENT" || echo "RULE_MISSING"
grep -q "Banned Patterns" .claude/rules/visual-language.md && echo "BANNED_PRESENT" || echo "BANNED_MISSING"
grep -q "Required Primitives" .claude/rules/visual-language.md && echo "PRIMITIVES_PRESENT" || echo "PRIMITIVES_MISSING"
```

Expected output:
```
EXISTS
RULE_PRESENT
BANNED_PRESENT
PRIMITIVES_PRESENT
```

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/visual-language.md
git commit -m "feat(governance): add visual language rules

Single source of truth for the strict typographic rule, banned patterns,
required primitives, color calibration gate, motion budget, and review
enforcement. Referenced by all UI agents and CLAUDE.md.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 1)
Spec: docs/superpowers/specs/2026-05-26-hyve-platform-design.md §1, §8"
```

---

### Task 2: Create the hyve-visual-language skill

**Files:**
- Create: `.claude/skills/hyve-visual-language/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run:
```bash
mkdir -p .claude/skills/hyve-visual-language
```

- [ ] **Step 2: Write `.claude/skills/hyve-visual-language/SKILL.md`**

Full content:

````markdown
---
name: hyve-visual-language
description: Use when adding a new UI primitive, refactoring a component that carries banned chrome, or resolving a case where docs/spec.md and the visual language rules conflict. Provides the decision framework for keeping the codebase free of vibe-coded patterns.
---

# Hyve Visual Language Skill

This skill operationalizes the rules in `.claude/rules/visual-language.md`. Use it when the rule alone isn't enough — when you need to *make a decision* about how to apply the rule.

## When To Invoke

1. **Adding a new primitive.** Before creating a new component in `src/components/ui/`, check against the rules + decide whether a new token is needed.
2. **Refactoring a component that carries banned chrome.** When migrating away from `status-pill`, `privacy-chip`, eyebrow patterns, decorative dots.
3. **Resolving a conflict between `docs/spec.md` and the visual rules.** The rules always win. This skill explains how to translate the spec requirement into a rule-compliant approach.

## Core Reference

Always read first:
- `.claude/rules/visual-language.md` — the rules
- `docs/superpowers/specs/2026-05-26-hyve-platform-design.md` §1 + §7 — the rationale and primitive specs

## Decision Framework — Adding a New Primitive

Before creating a component, answer:

1. **What signal does it convey?** (state, freshness, hierarchy, identity, capability, etc.)
2. **Is there an existing primitive for this signal?** If yes — use it. If no, continue.
3. **What's the typographic-only rendering for this signal?** Color of text, weight, spacing — NEVER fill, border, dot, pill.
4. **Does it need a new token?** If yes, propose it in your PR description. Token additions go through `ui-ux-pro-max` calibration.
5. **Where does it live?** `src/components/ui/` for shared primitives; `src/components/features/<feature>/` for feature-scoped ones.

## Decision Framework — Refactoring Banned Chrome

When you encounter a banned pattern in existing code:

| Pattern | Replacement |
|---|---|
| `<StatusPill tone="success">Approved</StatusPill>` | `<Status tone="success">Approved</Status>` |
| `<PrivacyChip level="aggregate" />` | `<PrivacyLevel level="aggregate" />` |
| `<span className="h-1 w-1 rounded-full bg-green-500" />` followed by text | Drop the dot; tint the adjacent text instead via `--status-*-muted` |
| `<span className="text-[10px] uppercase tracking-[0.12em]">SECTION</span>` | `<h3>` with normal weight, muted color, structural spacing |
| `// ── Section ──` JSX comment dividers | Delete them; structure makes the section clear |

## Decision Framework — Spec vs Rules Conflict

When `docs/spec.md` (the input brief) says one thing and `.claude/rules/visual-language.md` says another, the **rules win**.

Known conflicts already resolved in the design doc:
- Spec asks for freshness *dots* → Rules require *tinted timestamps* (text-only).
- Spec asks for status *pills* → Rules require *colored verbs* (text-only).
- Spec asks for slide-in animations + checkmark draw-on → Rules permit opacity fade only.
- Spec asks for privacy *chips* → Rules require inline colored text in table cells.

If you encounter a new conflict not listed above, document it in your PR description and propose the rule-compliant translation.

## Verification

Before declaring a change complete:

1. Read `.claude/rules/visual-language.md` and confirm every banned pattern is absent.
2. Confirm required primitives are used where applicable.
3. Run `pnpm lint` — no new violations.
4. Dispatch `ui-design-reviewer` for a visual review.

## Related

- `.claude/rules/visual-language.md` — the rules
- `.claude/agents/ui-component-dev.md` — implementer that consumes this skill
- `.claude/agents/ui-design-reviewer.md` — reviewer that enforces compliance
- `docs/superpowers/specs/2026-05-26-hyve-platform-design.md` — full design context
````

- [ ] **Step 3: Verify the file exists and is well-formed**

Run:
```bash
test -f .claude/skills/hyve-visual-language/SKILL.md && echo "EXISTS" || echo "MISSING"
head -5 .claude/skills/hyve-visual-language/SKILL.md | grep -q "name: hyve-visual-language" && echo "FRONTMATTER_OK" || echo "FRONTMATTER_MISSING"
grep -q "Decision Framework — Adding a New Primitive" .claude/skills/hyve-visual-language/SKILL.md && echo "ADD_PRIM_PRESENT" || echo "ADD_PRIM_MISSING"
grep -q "Decision Framework — Refactoring Banned Chrome" .claude/skills/hyve-visual-language/SKILL.md && echo "REFACTOR_PRESENT" || echo "REFACTOR_MISSING"
```

Expected:
```
EXISTS
FRONTMATTER_OK
ADD_PRIM_PRESENT
REFACTOR_PRESENT
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/hyve-visual-language/
git commit -m "feat(governance): add hyve-visual-language skill

Operationalizes visual-language.md rules. Three decision frameworks:
adding new primitives, refactoring banned chrome, resolving spec-vs-rules
conflicts. Invoked by ui-component-dev and ui-design-reviewer.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 2)"
```

---

### Task 3: Update ui-component-dev agent

**Files:**
- Modify: `.claude/agents/ui-component-dev.md` (frontmatter `skills:` list + new section in body)

- [ ] **Step 1: Read the current agent file to confirm structure**

Run:
```bash
head -15 .claude/agents/ui-component-dev.md
```

Expected output begins with `---`, has `name:`, `description:`, `tools:`, `model:`, `color:`, `skills:` (a YAML list), and a closing `---`. The current `skills:` list contains: `frontend-design`, `vercel-composition-patterns`, `vercel-react-best-practices`, `typescript-advanced-types`, `web-design-guidelines`.

- [ ] **Step 2: Add `ui-ux-pro-max` and `hyve-visual-language` to the skills list**

Use Edit to modify the skills list. The old block:
```yaml
skills:
  - frontend-design
  - vercel-composition-patterns
  - vercel-react-best-practices
  - typescript-advanced-types
  - web-design-guidelines
```

Becomes:
```yaml
skills:
  - frontend-design
  - ui-ux-pro-max
  - hyve-visual-language
  - vercel-composition-patterns
  - vercel-react-best-practices
  - typescript-advanced-types
  - web-design-guidelines
```

- [ ] **Step 3: Append a new "Hyve Visual Language" section to the body**

Append this section at the end of the agent file (after the existing content). Use Edit by finding the last paragraph and adding after it. If unclear where to insert, append before EOF.

````markdown

## Hyve Visual Language (non-negotiable)

Before writing or modifying ANY component, you MUST read `.claude/rules/visual-language.md` and honor every rule in it.

**Forbidden imports (build will fail):**
- `@/components/v2/ui/status-pill` → use `<Status>` instead
- `@/components/v2/ui/privacy-chip` → use `<PrivacyLevel>` instead

**Forbidden inline patterns (lint will warn; review will fail):**
- `text-[10px] uppercase tracking-*` used as decorative section labels
- `<span className="h-1 w-1 rounded-full bg-*" />` decorative dots
- `// ── Section ──` style JSX divider comments
- Any glow, pulse, shimmer, slide-in, or checkmark-drawing animation

**Required primitives (must use over ad-hoc):**
- `<Status>` for state verbs
- `<Timestamp>` for freshness
- `<PrivacyLevel>` for privacy posture display
- `<Section>` + native `<h2>` / `<h3>` for hierarchy
- `<Disabled>` for sidebar items shown to anon
- `<ResourceCard>` for Home-page resource entries

When a primitive doesn't exist for your case: stop, invoke the `hyve-visual-language` skill, and propose adding it — do not invent inline chrome.

**Color rule:** no hex value enters the codebase without `ui-ux-pro-max` calibration. Use tokens (`--status-*`, `--privacy-*`, `--accent`, `--bg`, `--surface`) — never raw hex.
````

- [ ] **Step 4: Verify the changes**

Run:
```bash
grep -q "ui-ux-pro-max" .claude/agents/ui-component-dev.md && echo "SKILL_LISTED" || echo "SKILL_MISSING"
grep -q "hyve-visual-language" .claude/agents/ui-component-dev.md && echo "VL_SKILL_LISTED" || echo "VL_SKILL_MISSING"
grep -q "Hyve Visual Language (non-negotiable)" .claude/agents/ui-component-dev.md && echo "SECTION_ADDED" || echo "SECTION_MISSING"
grep -q "Forbidden imports" .claude/agents/ui-component-dev.md && echo "FORBIDDEN_LISTED" || echo "FORBIDDEN_MISSING"
```

Expected:
```
SKILL_LISTED
VL_SKILL_LISTED
SECTION_ADDED
FORBIDDEN_LISTED
```

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/ui-component-dev.md
git commit -m "feat(governance): wire visual-language rules into ui-component-dev

Adds ui-ux-pro-max + hyve-visual-language to the agent's mandatory skill
loads. Appends a non-negotiable visual-language section listing forbidden
imports, forbidden inline patterns, and required primitives.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 3)"
```

---

### Task 4: Update ui-design-reviewer agent

**Files:**
- Modify: `.claude/agents/ui-design-reviewer.md`

- [ ] **Step 1: Add `ui-ux-pro-max` and `hyve-visual-language` to the skills list**

Find the existing skills block in the frontmatter:
```yaml
skills:
  - frontend-design
  - web-design-guidelines
```

Change to:
```yaml
skills:
  - frontend-design
  - ui-ux-pro-max
  - hyve-visual-language
  - web-design-guidelines
```

- [ ] **Step 2: Append a "Hyve Visual Language Review Checklist" section to the body**

Append at the end of the agent file:

````markdown

## Hyve Visual Language Review Checklist (mandatory, fails review on any item)

Before approving any UI change, read `.claude/rules/visual-language.md` and verify each of the following:

**Pattern checks:**
- [ ] No decorative status dots (`<span class*="h-1 w-1 rounded-full bg-*">`).
- [ ] No eyebrow uppercase tracked labels (`text-[10px] uppercase tracking-*`).
- [ ] No code-comment style UI labels (`// section`, `── divider ──`, `[…]` brackets used decoratively).
- [ ] No floating progress bars, signature pills, or "done" glows.
- [ ] No pulsing dots, rotating spinners, or shimmer skeletons.
- [ ] No stock vector illustrations.
- [ ] No slide-in animations on lists (opacity fade only).
- [ ] Color is never the sole signal (every colored state has an adjacent text label).

**Primitive checks:**
- [ ] State verbs render via `<Status>` (or equivalent typographic-only treatment).
- [ ] Freshness renders via `<Timestamp>`, no dots.
- [ ] Privacy levels render via `<PrivacyLevel>`, no chips.
- [ ] Section grouping uses heading hierarchy + spacing, no eyebrow labels.
- [ ] Sidebar items shown to anon use `<Disabled>`, not a custom muted style.
- [ ] Home-page resource entries use `<ResourceCard>`.

**Color palette checks:**
- [ ] No raw hex values in the diff (uses CSS variable tokens).
- [ ] Color pairs feel calibrated — not cheap, not garish, not generic-Tailwind.
- [ ] If color values were added or changed, confirm they were calibrated through `ui-ux-pro-max` (request that pass if missing).

**Motion checks:**
- [ ] All animations are opacity fades, hover transitions, or collapse/expand — nothing else.
- [ ] Duration ≤200ms.
- [ ] `prefers-reduced-motion` respected (any transition uses media query or token that responds to it).

If any box fails: reject the change with specific reference to the failing rule(s) and the corresponding section of `.claude/rules/visual-language.md`.
````

- [ ] **Step 3: Verify the changes**

Run:
```bash
grep -q "ui-ux-pro-max" .claude/agents/ui-design-reviewer.md && echo "SKILL_LISTED" || echo "SKILL_MISSING"
grep -q "hyve-visual-language" .claude/agents/ui-design-reviewer.md && echo "VL_SKILL_LISTED" || echo "VL_SKILL_MISSING"
grep -q "Hyve Visual Language Review Checklist" .claude/agents/ui-design-reviewer.md && echo "CHECKLIST_ADDED" || echo "CHECKLIST_MISSING"
grep -c "^- \[ \]" .claude/agents/ui-design-reviewer.md
```

Expected:
```
SKILL_LISTED
VL_SKILL_LISTED
CHECKLIST_ADDED
```
…and the checkbox count should be ≥18 (8 pattern + 6 primitive + 3 palette + 3 motion = 20, give or take).

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/ui-design-reviewer.md
git commit -m "feat(governance): add visual-language review checklist to ui-design-reviewer

Mandatory checklist covering pattern checks, primitive checks, color palette
checks, and motion checks. Reviewer fails the change on any unchecked box.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 4)"
```

---

### Task 5: Update accessibility-auditor agent

**Files:**
- Modify: `.claude/agents/accessibility-auditor.md`

- [ ] **Step 1: Add `ui-ux-pro-max` to the skills list**

Find:
```yaml
skills:
  - web-design-guidelines
  - frontend-design
```

Change to:
```yaml
skills:
  - web-design-guidelines
  - frontend-design
  - ui-ux-pro-max
```

(Note: do not add `hyve-visual-language` here — the auditor's concern is a11y, not visual language. The two agents pair up; visual-language is enforced by `ui-design-reviewer`.)

- [ ] **Step 2: Append a "Hyve Accessibility Floor" section to the body**

Append at the end of the agent file:

````markdown

## Hyve Accessibility Floor (cross-references `.claude/rules/visual-language.md` §Accessibility)

Beyond the general WCAG 2.2 AA framework above, the following Hyve-specific checks apply:

- [ ] **Color is never the sole signal.** The visual language rule mandates that every colored state has a text label adjacent. Verify: any colored span/text in the change has accompanying plain-text context.
- [ ] **Native focus rings only.** No custom focus glow (no `outline: none` without a replacement; no `box-shadow: 0 0 …`-style custom focus indicators). Browser-default focus ring or a 2px solid `--accent` is acceptable.
- [ ] **`prefers-reduced-motion` honored.** Any transition added must either use a media query that disables it under `prefers-reduced-motion: reduce`, or use a CSS variable / utility class that responds to the OS-level setting.
- [ ] **Skip-to-content link in shell.** When auditing layout or shell changes, verify the shell exposes a visible-on-focus skip link as the first focusable element.
- [ ] **Form fields labeled.** No placeholder-as-label patterns (placeholders disappear on input and fail screen-reader announcement on re-focus).
- [ ] **ARIA on icon-only controls.** Sidebar collapse, hover-revealed actions, modal close — all must have `aria-label` or visible text.
- [ ] **Disabled sidebar items (anon)** announce as disabled, with a tooltip/title explaining why ("Sign in to use"). Click does not silently fail — it routes to `/login?returnTo=...`.

When any box fails, reject the change with specific WCAG criterion and the corresponding rule in `.claude/rules/visual-language.md`.
````

- [ ] **Step 3: Verify**

Run:
```bash
grep -q "ui-ux-pro-max" .claude/agents/accessibility-auditor.md && echo "SKILL_LISTED" || echo "SKILL_MISSING"
grep -q "Hyve Accessibility Floor" .claude/agents/accessibility-auditor.md && echo "FLOOR_ADDED" || echo "FLOOR_MISSING"
grep -q "prefers-reduced-motion" .claude/agents/accessibility-auditor.md && echo "PRM_PRESENT" || echo "PRM_MISSING"
```

Expected:
```
SKILL_LISTED
FLOOR_ADDED
PRM_PRESENT
```

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/accessibility-auditor.md
git commit -m "feat(governance): add Hyve accessibility floor to accessibility-auditor

Adds ui-ux-pro-max skill load + cross-references visual-language.md §Accessibility.
Seven Hyve-specific checks layered on top of the WCAG 2.2 AA framework.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 5)"
```

---

### Task 6: Update hyve-driven-development skill

**Files:**
- Modify: `.claude/skills/hyve-driven-development/SKILL.md`

- [ ] **Step 1: Find the routing-table or guardrails section**

Run:
```bash
grep -n "Hyve guardrails" .claude/skills/hyve-driven-development/SKILL.md
grep -n "Mandatory Reviewer Pairings" .claude/skills/hyve-driven-development/SKILL.md
```

Confirm both sections exist (they should — verified in the spec brainstorm).

- [ ] **Step 2: Locate the "Hyve guardrails" injection text and append a visual-language note**

Find the text describing what's injected into every implementer prompt — phrasing like "Hyve guardrails are injected into every implementer prompt — Product Test, no `any`, RSC default, Zod validation, design tokens."

After the existing list (which ends with "design tokens"), add a new bullet/line:

```
- **Visual language rules** are non-negotiable. See `.claude/rules/visual-language.md`. Any UI implementer must check banned patterns + required primitives before declaring done.
```

(The exact insertion point depends on the file's current structure. Use Read to find the exact location, then Edit to insert.)

- [ ] **Step 3: Confirm ui-design-reviewer + accessibility-auditor are listed as mandatory reviewers for UI changes**

Run:
```bash
grep -A 2 "Any \.tsx component" .claude/skills/hyve-driven-development/SKILL.md
```

Expected: shows `ui-design-reviewer` mapped to `.tsx` changes. If accessibility-auditor isn't paired in the table for interactive widgets, add a note (the table likely already has it — verify before editing).

- [ ] **Step 4: Verify**

Run:
```bash
grep -q "visual-language.md" .claude/skills/hyve-driven-development/SKILL.md && echo "RULES_LINKED" || echo "RULES_MISSING"
grep -q "ui-design-reviewer" .claude/skills/hyve-driven-development/SKILL.md && echo "REVIEWER_PRESENT" || echo "REVIEWER_MISSING"
```

Expected:
```
RULES_LINKED
REVIEWER_PRESENT
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/hyve-driven-development/SKILL.md
git commit -m "feat(governance): inject visual-language rules into hyve-driven-development

Adds visual-language rule reference to the implementer-prompt guardrails
list. Every UI dispatch now carries the rule citation.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 6)"
```

---

### Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the "Product context" section**

Find the section beginning with `## Product context — what you are building`. The current text describes Hyve as "operator tooling" for fund originators. Replace with broader 3-actor framing.

Find the current heading and the paragraph that begins with "This is operator tooling.".

Replace that paragraph with:

```
Hyve is a unified platform with three actors who share one sidebar shell:

- **Data owner / originator** — uploads private datasets, defines schemas and per-column privacy posture, approves curator Analyses, controls publication.
- **Curator** — browses vaults, authors SQL Analyses against schemas, proposes them to owners, receives attested results, configures downstream delivery (oracle / webhook / API / visualization).
- **Public verifier** — anyone, no account. Browses the public attestation feed, opens attestation detail pages, verifies cryptographic proofs independently. The Dune-like public surface.

A single account can hold multiple roles (owner + curator). The shell adapts via additive nav items, never via mode toggle. Anonymous visitors see the same sidebar shell with auth-gated items shown disabled, not hidden.
```

Then find the "NOT" list (the bulleted list of "This is NOT") and update only the "Not an oracle" bullet to soften:

Old:
```
- Not an oracle (oracles deliver signed payloads on-chain; Hyve produces what they deliver — the on-chain publication is one output channel, not the product)
```

New:
```
- Not an oracle itself, though oracle-adjacent — Hyve hosts signed attestations as a public good, and the curator's Oracle output tab pushes attestations onchain. The platform doesn't sign values onchain itself; it produces what gets signed.
```

- [ ] **Step 2: Add a new "Visual language" section**

After the existing "Universal Rules" section (or wherever fits the flow), add a new section:

```
## Visual Language

The codebase enforces a strict typographic visual language. Information is conveyed through type weight + a constrained color palette, never through chrome (no pills, no dots, no chips, no eyebrow labels).

Single source of truth: `.claude/rules/visual-language.md`.

Any UI change is reviewed by `ui-design-reviewer` against the visual language checklist. Build fails on banned imports (`status-pill`, `privacy-chip`) and flags banned inline patterns (eyebrow text, decorative dots) via ESLint.

Skill: `.claude/skills/hyve-visual-language/SKILL.md` — invoke when adding a new primitive, refactoring banned chrome, or resolving spec-vs-rules conflicts.
```

- [ ] **Step 3: Update the "Skills in Use" section**

Find the existing skills inventory. Look for `ui-minimalist` and remove it from any list (replaced by `ui-ux-pro-max`). If the list does not currently include `ui-ux-pro-max` and `hyve-visual-language`, add them under the project skills group.

Old (project skills group; replace whatever's there with this — verify by reading first):
```
**Project skills:**

- `visual-fix` — the screenshot-fix-screenshot loop for UI bugs
```

New:
```
**Project skills:**

- `visual-fix` — the screenshot-fix-screenshot loop for UI bugs
- `hyve-visual-language` — decision framework for new primitives, refactoring banned chrome, and spec-vs-rules conflicts
- `hyve-driven-development` — orchestrator that dispatches the right specialist + reviewers per file type

**Frontend craft additions:**

- `ui-ux-pro-max` — replaces the prior `ui-minimalist`. Color-palette catalog, font-pairing rules, density and interaction-state guidance. Required for every UI change.
```

- [ ] **Step 4: Add a non-negotiable rule for the visual language**

Find the "Non-Negotiable Rules" numbered list. The current list has 7 items. Add as item 8:

```
8. **Strict typographic rule.** See `.claude/rules/visual-language.md`. Banned: decorative dots, eyebrow labels, status pills, privacy chips, code-comment style labels, glows, slide-in animations on lists, color as sole signal. Required: typographic primitives (`<Status>`, `<Timestamp>`, `<PrivacyLevel>`, `<Section>`, `<Disabled>`, `<ResourceCard>`). Every UI change must pass `ui-design-reviewer`.
```

- [ ] **Step 5: Add an architecture principle for composition over chrome**

Find the "Architecture Principles" numbered list. Add as a new final principle:

```
6. Composition lives on top of typographic primitives, not on top of chrome primitives. Information through type weight + constrained color, never through fills, borders, or decorative shapes.
```

- [ ] **Step 6: Verify**

Run:
```bash
grep -q "three actors who share one sidebar shell" CLAUDE.md && echo "PRODUCT_UPDATED" || echo "PRODUCT_MISSING"
grep -q "## Visual Language" CLAUDE.md && echo "VL_SECTION_ADDED" || echo "VL_SECTION_MISSING"
grep -q "ui-ux-pro-max" CLAUDE.md && echo "UXPM_LISTED" || echo "UXPM_MISSING"
grep -q "Strict typographic rule" CLAUDE.md && echo "RULE_8_ADDED" || echo "RULE_8_MISSING"
grep -q "Composition lives on top of typographic primitives" CLAUDE.md && echo "PRINCIPLE_6_ADDED" || echo "PRINCIPLE_6_MISSING"
! grep -q "ui-minimalist" CLAUDE.md && echo "MINIMALIST_REMOVED" || echo "MINIMALIST_STILL_PRESENT"
```

Expected:
```
PRODUCT_UPDATED
VL_SECTION_ADDED
UXPM_LISTED
RULE_8_ADDED
PRINCIPLE_6_ADDED
MINIMALIST_REMOVED
```

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(governance): broaden product framing + add visual-language rule

- Rewrites Product context to describe the 3-actor unified platform.
- Softens 'Not an oracle' to acknowledge the oracle-adjacent public explorer.
- Adds Visual Language section pointing at .claude/rules/visual-language.md.
- Replaces ui-minimalist with ui-ux-pro-max in Skills in Use.
- Adds Non-Negotiable rule #8 (strict typographic rule).
- Adds Architecture Principle #6 (composition over chrome).

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 7)
Spec: docs/superpowers/specs/2026-05-26-hyve-platform-design.md §Product framing, §8.5"
```

---

### Task 8: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Read current contents**

Run:
```bash
cat AGENTS.md
```

Expected: a short file (2-3 lines) about Next.js 16 being different.

- [ ] **Step 2: Replace the file contents**

Overwrite with:

```
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# This codebase has a strict visual language

See `.claude/rules/visual-language.md`. The rules are non-negotiable.

- `ui-design-reviewer` fails on banned patterns (decorative dots, eyebrow labels, status pills, etc.).
- Build fails on banned imports (`status-pill`, `privacy-chip`) via ESLint `no-restricted-imports`.
- Build warns on banned inline patterns (eyebrow text, decorative dots) via ESLint `no-restricted-syntax`. Plan 2 (design system foundation) promotes these to errors after migration.

# The agent system uses Hyve-driven development

See `.claude/skills/hyve-driven-development/SKILL.md`. Specialists own their file types — the main session never writes code that a specialist owns. Always dispatch.

Common dispatches:
- `ui-component-dev` for `.tsx` components and pages
- `design-system` for `src/components/ui/`, tokens, theme variables
- `routing-nav` for routes, layouts, middleware
- `api-integration` for `src/lib/api/`, Server Actions
- `docs-writer` for `.claude/agents/`, `.claude/skills/`, `.claude/rules/`, `CLAUDE.md`, `AGENTS.md`, `docs/`
- `build-deploy` for `eslint.config.mjs`, `next.config.*`, `.env*`, `.github/workflows/`

Mandatory paired reviewers per change type are listed in the routing-table in `.claude/skills/hyve-driven-development/SKILL.md`.
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -q "strict visual language" AGENTS.md && echo "VL_LINKED" || echo "VL_MISSING"
grep -q "hyve-driven-development" AGENTS.md && echo "HDD_LINKED" || echo "HDD_MISSING"
grep -q "no-restricted-imports" AGENTS.md && echo "ESLINT_REF" || echo "ESLINT_REF_MISSING"
```

Expected:
```
VL_LINKED
HDD_LINKED
ESLINT_REF
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs(governance): expand AGENTS.md with visual language + dispatch guidance

Adds three sections: Next.js caveats (unchanged), strict visual language
reference, and hyve-driven-development dispatch table.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 8)"
```

---

### Task 9: Add ESLint `no-restricted-imports` for banned primitives

**Files:**
- Modify: `eslint.config.mjs`
- Test (transient): `__lint_fixtures__/test-banned-import.tsx` (created in verify, deleted after)

- [ ] **Step 1: Read the current ESLint config**

Run:
```bash
cat eslint.config.mjs
```

Confirm structure: imports flat-config-style, exports `defineConfig([...])`.

- [ ] **Step 2: Add the `no-restricted-imports` rule**

The current file ends with `]);`. Modify to insert a new config object before the `globalIgnores(...)` entry, so the rule applies to all source files.

Replace the existing `defineConfig` array with this expanded version:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Hyve visual language — banned primitives.
  // See .claude/rules/visual-language.md and docs/superpowers/specs/2026-05-26-hyve-platform-design.md §1.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/components/v2/ui/status-pill", "**/components/v2/ui/status-pill/**"],
              message: "status-pill is banned. Use <Status> from src/components/ui/status. See .claude/rules/visual-language.md.",
            },
            {
              group: ["**/components/v2/ui/privacy-chip", "**/components/v2/ui/privacy-chip/**"],
              message: "privacy-chip is banned. Use <PrivacyLevel> from src/components/ui/privacy-level. See .claude/rules/visual-language.md.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored/generated static assets — not our code
    "public/duckdb/**",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 3: Write a fixture that violates the rule**

Create `__lint_fixtures__/test-banned-import.tsx`:

```tsx
// FIXTURE — verifies no-restricted-imports rule.
// This file is intentionally transient; it's created in Task 9 to verify the
// ESLint rule fires, then deleted in the same task.
import { StatusPill } from "@/components/v2/ui/status-pill";

export function FixtureComponent() {
  return <StatusPill tone="success">Test</StatusPill>;
}
```

(If the path `@/` doesn't resolve, try a relative path: `import { StatusPill } from "../src/components/v2/ui/status-pill";`. Use whichever resolves in the existing codebase — confirm by reading `tsconfig.json` `paths`.)

Note: this fixture's import target may or may not currently exist as a file (the `status-pill` file is documented as existing per the design doc's Explore findings). The lint rule fires on the import *pattern*, not on resolution success.

- [ ] **Step 4: Run ESLint on the fixture and confirm the rule fires**

Run:
```bash
pnpm lint __lint_fixtures__/test-banned-import.tsx 2>&1 | head -20
```

Expected output: ESLint reports an error citing the configured message ("status-pill is banned. Use <Status> from src/components/ui/status."). Exit code non-zero.

If the rule does NOT fire, debug:
1. Confirm `pnpm lint` is the correct command (check `package.json` `scripts.lint`).
2. Confirm the `files:` glob includes the fixture path. The fixture is OUTSIDE `src/`. Move it to `src/__lint_fixtures__/test-banned-import.tsx` if needed.

- [ ] **Step 5: Delete the fixture**

Run:
```bash
rm -rf __lint_fixtures__ src/__lint_fixtures__
```

(Whichever was used.)

- [ ] **Step 6: Run `pnpm lint` on the full repo and capture existing violations**

Run:
```bash
pnpm lint 2>&1 | tail -80
```

Likely outcome: some existing files in `src/components/v2/` import `status-pill` or `privacy-chip` — the rule will report errors for each. Capture the file list. **Do not fix them in this plan** — they're Plan 2's migration targets.

If the existing-violation count is large (>20) and would block downstream development, change the rule severity from `"error"` to `"warn"` for both patterns in `eslint.config.mjs`. The intent is the same; promote to `error` after Plan 2 migrates the offenders.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.mjs
git commit -m "feat(governance): add ESLint no-restricted-imports for banned primitives

Blocks imports of status-pill and privacy-chip. Forces use of <Status> and
<PrivacyLevel> typographic primitives instead.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 9)
Spec: docs/superpowers/specs/2026-05-26-hyve-platform-design.md §8.4"
```

---

### Task 10: Add ESLint `no-restricted-syntax` for eyebrow + decorative-dot patterns

**Files:**
- Modify: `eslint.config.mjs` (add to the same config block from Task 9)
- Test (transient): `src/__lint_fixtures__/test-banned-patterns.tsx`

- [ ] **Step 1: Add `no-restricted-syntax` rule**

In `eslint.config.mjs`, inside the same config object created in Task 9, add a `no-restricted-syntax` rule next to `no-restricted-imports`:

```js
"no-restricted-syntax": [
  "warn",
  {
    // Eyebrow uppercase tracked labels — visual chrome banned by §1.
    selector: "Literal[value=/text-\\[10px\\][^\"]*uppercase[^\"]*tracking-/]",
    message: "Eyebrow pattern (text-[10px] uppercase tracking-*) is banned. Use semantic heading hierarchy. See .claude/rules/visual-language.md.",
  },
  {
    // Decorative status dots — visual chrome banned by §1.
    selector: "Literal[value=/h-1[^\"]*w-1[^\"]*rounded-full[^\"]*bg-/]",
    message: "Decorative dot pattern (h-1 w-1 rounded-full bg-*) is banned. Tint adjacent text instead. See .claude/rules/visual-language.md.",
  },
],
```

The full rules block on this config object now contains two rules: `no-restricted-imports` (from Task 9) and `no-restricted-syntax` (this task).

- [ ] **Step 2: Write a fixture that violates the rules**

Create `src/__lint_fixtures__/test-banned-patterns.tsx`:

```tsx
// FIXTURE — verifies no-restricted-syntax rules.
// Transient; deleted in the same task.

export function EyebrowFixture() {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      DECORATIVE LABEL
    </div>
  );
}

export function DotFixture() {
  return <span className="h-1 w-1 rounded-full bg-green-500" />;
}
```

- [ ] **Step 3: Run ESLint on the fixture and confirm both rules fire**

Run:
```bash
pnpm lint src/__lint_fixtures__/test-banned-patterns.tsx 2>&1 | head -30
```

Expected output: ESLint reports two warnings (one per pattern) with the configured messages. Exit code 0 if severity is `warn` (warnings don't fail by default); non-zero if you promoted to `error`. Either is OK — the point is the rules fired.

If neither rule fires, debug the regex:
1. ESLint AST selectors use ECMAScript regex syntax. Double-escape backslashes in JSON-style strings.
2. The selector matches `Literal` nodes (string literals); it does NOT match JSX class attribute names directly — it matches the string *value* inside the className.
3. Confirm the file is included in the `files:` glob.

- [ ] **Step 4: Delete the fixture**

Run:
```bash
rm -rf src/__lint_fixtures__
```

- [ ] **Step 5: Run `pnpm lint` on the full repo to surface existing offenders**

Run:
```bash
pnpm lint 2>&1 | grep -E "(Eyebrow pattern|Decorative dot pattern)" | head -30
```

Expected: a list of existing files in `src/components/v2/` that contain these patterns (see Explore findings: `vault-detail/access-panel.tsx`, `vault-detail/privacy.tsx`, `dataset-detail-page.tsx`). These are Plan 2's migration targets.

**Do not fix the offenders in this plan.** Plan 2 handles migration.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs
git commit -m "feat(governance): add ESLint no-restricted-syntax for eyebrow + dot patterns

Flags 'text-[10px] uppercase tracking-*' (eyebrow chrome) and
'h-1 w-1 rounded-full bg-*' (decorative dots) as warnings. Promoted to
errors in Plan 2 after migration of existing offenders.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 10)
Spec: docs/superpowers/specs/2026-05-26-hyve-platform-design.md §8.4"
```

---

### Task 11: Remove deprecated minimalist-ui skill directory

**Files:**
- Delete: `.claude/skills/minimalist-ui/` (entire directory)

- [ ] **Step 1: Confirm the directory exists and is not referenced**

Run:
```bash
test -d .claude/skills/minimalist-ui && echo "EXISTS" || echo "ALREADY_GONE"
grep -r "minimalist-ui" .claude/ CLAUDE.md AGENTS.md 2>/dev/null | grep -v ".claude/skills/minimalist-ui"
```

Expected:
- First command: `EXISTS`
- Second command: empty (no remaining references in agents/skills/docs)

If the second command returns matches, investigate and remove those references before deleting the directory.

- [ ] **Step 2: Delete the directory**

Run:
```bash
rm -rf .claude/skills/minimalist-ui
```

- [ ] **Step 3: Verify**

Run:
```bash
test -d .claude/skills/minimalist-ui && echo "STILL_EXISTS" || echo "REMOVED"
```

Expected: `REMOVED`

- [ ] **Step 4: Commit**

```bash
git add -A .claude/skills/
git commit -m "chore(governance): remove deprecated minimalist-ui skill

Superseded by ui-ux-pro-max + hyve-visual-language. No remaining references
in agents, skills, or top-level docs.

Plan: docs/superpowers/plans/2026-05-26-governance-foundation.md (Task 11)"
```

---

### Task 12: End-to-end verification

**Files:**
- None modified. Read-only checks across the system.

- [ ] **Step 1: Confirm every artifact exists**

Run:
```bash
test -f .claude/rules/visual-language.md && echo "✓ rules" || echo "✗ rules MISSING"
test -f .claude/skills/hyve-visual-language/SKILL.md && echo "✓ skill" || echo "✗ skill MISSING"
grep -q "ui-ux-pro-max" .claude/agents/ui-component-dev.md && echo "✓ ui-component-dev wired" || echo "✗ ui-component-dev NOT wired"
grep -q "Hyve Visual Language Review Checklist" .claude/agents/ui-design-reviewer.md && echo "✓ ui-design-reviewer wired" || echo "✗ ui-design-reviewer NOT wired"
grep -q "Hyve Accessibility Floor" .claude/agents/accessibility-auditor.md && echo "✓ accessibility-auditor wired" || echo "✗ accessibility-auditor NOT wired"
grep -q "visual-language.md" .claude/skills/hyve-driven-development/SKILL.md && echo "✓ hyve-driven-development wired" || echo "✗ hyve-driven-development NOT wired"
grep -q "Visual Language" CLAUDE.md && echo "✓ CLAUDE.md updated" || echo "✗ CLAUDE.md NOT updated"
grep -q "strict visual language" AGENTS.md && echo "✓ AGENTS.md updated" || echo "✗ AGENTS.md NOT updated"
grep -q "no-restricted-imports" eslint.config.mjs && echo "✓ ESLint imports rule" || echo "✗ ESLint imports rule MISSING"
grep -q "no-restricted-syntax" eslint.config.mjs && echo "✓ ESLint syntax rule" || echo "✗ ESLint syntax rule MISSING"
test ! -d .claude/skills/minimalist-ui && echo "✓ minimalist-ui removed" || echo "✗ minimalist-ui still present"
```

Expected: all rows prefixed `✓`.

- [ ] **Step 2: Run the full lint and capture the offender list**

Run:
```bash
pnpm lint 2>&1 | grep -E "(banned|Eyebrow pattern|Decorative dot pattern)" | sort -u > /tmp/plan-1-offenders.txt
wc -l /tmp/plan-1-offenders.txt
cat /tmp/plan-1-offenders.txt | head -40
```

Expected: a non-empty list of files in `src/components/v2/` that import banned primitives or contain banned inline patterns. This is the *input* for Plan 2's migration task list.

- [ ] **Step 3: Save the offender list to the design-doc followups**

The offender list informs Plan 2. Either:

- Append the file paths to the spec under §Open questions, OR
- Save `/tmp/plan-1-offenders.txt` to `docs/superpowers/plans/2026-05-26-governance-foundation-offenders.txt` and reference it in Plan 2.

Either is acceptable. The latter keeps the spec clean and creates a discoverable input for the next plan.

Use the second approach:

```bash
cp /tmp/plan-1-offenders.txt docs/superpowers/plans/2026-05-26-governance-foundation-offenders.txt
git add docs/superpowers/plans/2026-05-26-governance-foundation-offenders.txt
git commit -m "chore(governance): capture Plan 1 lint-offender list as input for Plan 2"
```

- [ ] **Step 4: Final commit summary**

Run:
```bash
git log --oneline -20
```

Expected: 11 new commits (one per task 1–10 plus the offender-list commit from Task 12), all on the current branch.

---

## Self-Review (executed by plan author, not the implementing agent)

**Spec coverage:**

| Spec requirement | Implemented in |
|---|---|
| §1 banned patterns enumerated | Task 1 (rules file), Task 9 (imports), Task 10 (regex) |
| §1 required primitives enumerated | Task 1 (rules file), Task 3 (ui-component-dev) |
| §1 ESLint enforcement | Tasks 9, 10 |
| §1 color calibration gate | Task 1 (rules file), Task 4 (reviewer checklist) |
| §7.1 motion budget | Task 1 (rules file), Task 4 (reviewer checklist) |
| §7.9 accessibility floor | Task 5 (accessibility-auditor floor section) |
| §8.1 rules file | Task 1 |
| §8.2 agent updates (three agents) | Tasks 3, 4, 5 |
| §8.3 hyve-visual-language skill | Task 2 |
| §8.3 hyve-driven-development update | Task 6 |
| §8.4 ESLint config | Tasks 9, 10 |
| §8.5 CLAUDE.md updates | Task 7 |
| §8.6 AGENTS.md updates | Task 8 |
| §Sequencing step 1 | Task 1 |
| §Sequencing step 2 | Task 2 |
| §Sequencing step 3 | Tasks 3, 4, 5 |
| §Sequencing step 4 | Task 6 |
| §Sequencing step 5 | Tasks 7, 8 |
| §Sequencing step 6 | Tasks 9, 10 |
| (Implicit cleanup) | Task 11 (minimalist-ui removal) |
| End-to-end verification | Task 12 |

**Type consistency:** all primitive names referenced consistently across tasks (`<Status>`, `<Timestamp>`, `<PrivacyLevel>`, `<Section>`, `<Disabled>`, `<ResourceCard>` — no rename mid-plan).

**Placeholder scan:** no `TBD`, no `TODO`, no "implement later". All exact paths, exact content, exact commands.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-26-governance-foundation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task via `superpowers:subagent-driven-development`. Each task is reviewed before the next starts. Most tasks (1–8, 11) route to `docs-writer`; Tasks 9–10 route to `build-deploy`; Task 12 is read-only and stays in the orchestrator session.

2. **Inline Execution** — I execute tasks in this session using `superpowers:executing-plans`. Faster but no two-stage review.

Which approach?
