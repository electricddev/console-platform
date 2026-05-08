@AGENTS.md

# Next.js Production Frontend

[Replace with: 1-3 sentence description of your project]

## Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React state + Context (no Redux)
- **Forms:** React Hook Form + Zod
- **Backend:** Rust API (out of scope for frontend agents)
- **Testing:** Vitest (unit) + Playwright (E2E)
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

See `docs/architecture/overview.md` for detailed structure.

## Universal Rules

### Code

- TypeScript strict mode - never use `any`, prefer `unknown`
- Server Components by default - add `"use client"` only when needed
- Named exports only (except pages/layouts)
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities

### React/Next.js

- App Router only (no Pages Router)
- Async Server Components for data fetching
- Server Actions for mutations
- Suspense + loading.tsx for streaming
- Error boundaries on every major route

### Styling

- Tailwind CSS via design tokens
- No hardcoded colors (use CSS variables)
- shadcn/ui components in `src/components/ui/` (owned, not npm)
- Class composition via `cn()` utility

### Quality Gates (before push)

- `npm run typecheck` passes
- `npm run lint` passes (zero warnings)
- `npm run test` passes
- `npm run build` succeeds

### Git

- Conventional Commits format
- Feature branches → main
- PR required (no direct pushes to main)

## Common Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Run production build locally
npm run test         # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run format       # Prettier format
```

## Backend Integration

**API Base:** `process.env.RUST_API_URL`

**Pattern:**

- All API calls through `src/lib/api/client.ts`
- Zod schemas validate ALL responses (`src/lib/api/schemas.ts`)
- Server Components fetch directly
- Client Components use SWR for cached fetching
- Mutations use Server Actions

**Type safety:**

- API contract types in `src/lib/api/types.ts`
- Match Rust backend's serde structs
- Runtime validation prevents type lies

## Agent Workflow

This project uses Claude Code agents in `.claude/agents/`. They auto-trigger based on context:

| Agent                   | When It Triggers                     |
| ----------------------- | ------------------------------------ |
| `ui-component-dev`      | Creating/modifying components        |
| `state-management`      | State logic, hooks, context          |
| `api-integration`       | Backend integration                  |
| `routing-nav`           | Routes, layouts, navigation          |
| `code-reviewer`         | After code changes                   |
| `security-reviewer`     | Auth, input handling, sensitive code |
| `performance-optimizer` | Performance concerns                 |
| `accessibility-auditor` | Interactive components, forms        |
| `design-system`         | Tokens, theme, base components       |
| `ui-design-reviewer`    | After UI changes                     |
| `unit-tester`           | Writing unit tests                   |
| `e2e-tester`            | Writing E2E tests                    |
| `repo-architect`        | Structure changes                    |
| `build-deploy`          | Build/deploy configuration           |
| `docs-writer`           | Documentation                        |

You don't need to call them explicitly - they activate based on what you're doing.

## Skills in Use

This project uses these Claude Code skills:

- `frontend-design` (Anthropic) - Distinctive UI
- `vercel-react-best-practices` - Performance patterns
- `vercel-composition-patterns` - Component architecture
- `next-best-practices` - Next.js patterns
- `web-design-guidelines` - Accessibility/UX
- `typescript-advanced-types` - Type system
- `webapp-testing` - Testing patterns
- `superpowers:*` - Workflow orchestration

## Non-Negotiable Rules

1. **Never expose secrets to client code** - audit `NEXT_PUBLIC_` vars
2. **Validate API responses** - use Zod, don't trust the network
3. **Server-side authorization** - never trust client-side checks
4. **Accessibility is required** - WCAG 2.2 AA minimum
5. **Performance budget** - LCP <2.5s, INP <200ms, CLS <0.1
6. **No `any` types** - use `unknown` and narrow

## Architecture Principles

1. **Feature-based organization** - code that changes together stays together
2. **Public API boundaries** - features expose via index.ts
3. **Dependency direction flows down** - app → components → lib → types
4. **Server Components by default** - client only when interactive
5. **Composition over configuration** - compound components, not boolean props
