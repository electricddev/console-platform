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
