# ADR 0001 — Frontend foundation

**Date:** 2026-05-08
**Status:** Accepted

## Context

The Hyve Data Clean Room frontend is a large, AI-flavored dashboard product
spec'd against an unfinished Rust backend. We needed a foundation that lets
us ship feature-complete UI flows without waiting for the API and that allows
real backend swap-in later without rewriting components.

## Decision

1. **Flat Next.js layout** (`app/`, `components/`, `lib/`) over `src/`. Path alias
   `@/*` resolves from repo root. CLAUDE.md described `src/` aspirationally;
   we follow what actually works without a rename migration.
2. **Two route groups**: `(auth)` for unauthenticated UI, `(app)` for the
   dashboard with auth wall and persistent shell.
3. **Mock-first data layer**: every endpoint goes through `lib/api/endpoints/*`,
   shaped by Zod schemas in `lib/api/schemas.ts`, backed by deterministic
   fixtures. Real backend swap-in is replacing `lib/api/client.ts`.
4. **Stub auth via `iron-session`**: three demo personas. Real SSO/wallet
   sign-in is deferred to a separate plan.
5. **Trust primitives are first-class**: `<AttestationBadge>`,
   `<FreshnessIndicator>`, `<CopyableHash>` are commodities that every
   feature consumes.
6. **AI is a contract from day one**: `lib/api/endpoints/ai.ts` defines the
   shape every feature codes against; deterministic mock implementations.
7. **`proxy.ts` instead of `middleware.ts`**: Next.js 16 renamed the middleware
   entry-point convention. Auth guard lives in `proxy.ts` at repo root.

## Consequences

- Fast UI iteration without backend dependence.
- Clear seam for backend swap-in (one file).
- Stub auth means no real identity surface — that's a deliberate, plan-bounded
  scope decision.
- Tests can rely on round-tripped fixtures, not fakes.

## References

- Spec: `docs/superpowers/plans/2026-05-08-hyve-clean-room-INDEX.md`
- Plan: `docs/superpowers/plans/2026-05-08-01-foundation.md`
