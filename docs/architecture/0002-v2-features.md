# ADR 0002 — V2 features

**Date:** 2026-05-08
**Status:** Accepted

## Context

Plans 01–05 shipped the MVP. Plan 06 adds Copilot, Notebooks, Lineage,
and a status banner — the V2 surfaces from the spec §7.2.

## Decision

- **Copilot streams over Server Actions returning AsyncIterables.** No SSE
  endpoint needed — Next 16 + React 19 stream iterables across the wire.
- **Notebook cells are server-rendered** for SEO/share-link viability;
  edit-mode introduces a client shell when needed (deferred polish).
- **Lineage uses reactflow** for pan/zoom; it's the smallest dep that
  gives us decent flow rendering without bespoke SVG work.
- **Status banner mounts above the topbar** and reads from a public stub
  endpoint that maps to status.hyve.xyz when wired to a real backend.

## Consequences

- Copilot replies feel real-time despite the mock contract.
- Notebooks share-link viability is preserved — can render without auth
  in a future read-only public path.
- Lineage adds ~80kB gzipped (reactflow). Acceptable for an originator
  diagnostic surface that loads on demand.
