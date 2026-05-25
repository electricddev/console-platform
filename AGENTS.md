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
