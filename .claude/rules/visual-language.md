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
