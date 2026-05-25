# Hyve Platform Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Hyve platform spec — design system foundation, unified shell + identity model, public verification flow, data ingestion refactor, Analysis lifecycle (incl. SQL builder), search, and cross-cutting concerns. The agent + skill + ESLint governance is implemented by the sibling plan `2026-05-26-governance-foundation.md` and is NOT in scope here.

**Architecture:** Eight sequential phases (A → H). Each phase produces working, testable software. Foundation work first (Phase A: tokens + primitives; Phase B: shell + identity); then features (C: Homes; D: Public Verification; E: Data Ingestion; F: Analysis Lifecycle; G: Search; H: Cross-cutting polish). Phases A + B block everything downstream. Phases C–G are independent of each other once A + B ship; they may execute in parallel if multiple worktrees are available. Phase H is final polish + audit.

**Tech Stack:** Next.js 16 App Router (RSC default), TypeScript strict, shadcn/ui (already installed), Tailwind CSS with OKLCH tokens, React Hook Form + Zod, SWR for client fetches, Server Actions for mutations, Vitest + RTL for unit tests, Playwright for E2E, Monaco editor for the SQL builder, sonner for toasts.

**Source spec:** `docs/superpowers/specs/2026-05-26-hyve-platform-design.md`. Read it before starting any task — every task references specific sections of the design.

**Hard preconditions:**

- `2026-05-26-governance-foundation.md` MUST be complete before Phase A starts. The visual-language rules + ESLint enforcement + agent updates need to be active so the implementing agents are operating under the new rules.
- `.claude/rules/visual-language.md` exists.
- `ui-ux-pro-max` plugin skill is installed.
- ESLint `no-restricted-imports` rule is configured (Plan 1 Task 9).
- `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck` all work.

**Routing (per `.claude/skills/hyve-driven-development/SKILL.md`):**

- `ui-component-dev` for components and pages (`src/components/**/*.tsx`, `src/app/**/*.tsx`)
- `design-system` for primitives in `src/components/ui/`, tokens, theme vars, `globals.css`
- `routing-nav` for new routes, layouts, middleware
- `api-integration` for `src/lib/api/`, Server Actions, SWR hooks, Zod schemas, auth/session
- `state-management` for context providers, complex form state
- `unit-tester` for `*.test.tsx` files
- `e2e-tester` for `tests/e2e/`
- `docs-writer` for `docs/`, README changes
- `build-deploy` for `next.config.*`, `eslint.config.mjs`, `.env*`

Mandatory paired reviewers (per `hyve-driven-development`):

- `ui-design-reviewer` runs on every `.tsx` change. Takes Playwright screenshot. Verifies visual-language compliance.
- `accessibility-auditor` runs on forms, modals, dropdowns, focus management, keyboard interaction.
- `security-reviewer` runs on auth, env vars, user input, API integration.
- `performance-optimizer` runs on heavy imports, large lists, animations.

**Visual feedback loop:** Per `CLAUDE.md`, every UI bug fix uses the visual-fix skill (screenshot → identify → plan → implement → verify). The `Stop` hook blocks completion until visually verified.

---

## Phase A — Design system foundation

Tokens + primitives. After this phase, the typographic primitives exist and are calibrated. After Phase A's migration tasks, the banned primitives (`status-pill`, `privacy-chip`) are deleted and the build is clean.

### Task A1: Calibrate the color palette via ui-ux-pro-max

**Files:**
- Create: `docs/design-system/2026-05-26-color-calibration.md` (the output token map)

This is a design exercise, not pure code. The output is a locked OKLCH token map that feeds every subsequent task.

- [ ] **Step 1: Invoke ui-ux-pro-max with the calibration brief**

Brief to invoke:
> Calibrate a 5-color status palette + 5-color privacy palette + accent + surfaces for the Hyve platform. Constraints: warm canvas (not pure white, not dark mode), forest-green primary accent (`oklch(0.40 0.10 160)` per CLAUDE.md), no garish hues, no neon, no purple. Each status/privacy color has both a normal variant (used on white surface for inline labels in text) and a `-muted` variant (used as subtle tinted background OR de-emphasized text). The palette must work on warm-white `#fafafa` AND elevated white `#ffffff`. Target the institutional/Bloomberg/Stripe feel called out in `docs/spec.md` §5.1. Output: OKLCH triplets for each token, contrast ratios against both surfaces, and 3–5 candidate variants the user can pick from.

- [ ] **Step 2: Present candidate palettes to user**

Render the candidates as a side-by-side preview. User picks one. Document the choice in `docs/design-system/2026-05-26-color-calibration.md` with:
- Final OKLCH values for: `--status-success / -muted`, `--status-warning / -muted`, `--status-danger / -muted`, `--status-info / -muted`, `--status-neutral / -muted`, `--privacy-private`, `--privacy-join`, `--privacy-aggregate`, `--privacy-dimension`, `--privacy-select`, `--accent`, `--bg` (warm canvas), `--surface` (elevated card), `--border`, `--ring` (focus)
- Contrast ratio table (each color × {warm-canvas, elevated-white}, vs WCAG AA threshold 4.5:1 for body text, 3:1 for large text)
- Rationale paragraph explaining the choice

- [ ] **Step 3: Verify**

Run:
```bash
test -f docs/design-system/2026-05-26-color-calibration.md && echo "EXISTS" || echo "MISSING"
grep -q "OKLCH" docs/design-system/2026-05-26-color-calibration.md && echo "OKLCH_PRESENT" || echo "OKLCH_MISSING"
grep -q "contrast" docs/design-system/2026-05-26-color-calibration.md && echo "CONTRAST_DOCUMENTED" || echo "CONTRAST_MISSING"
```

- [ ] **Step 4: Commit**

```bash
git add docs/design-system/
git commit -m "design(tokens): lock color palette via ui-ux-pro-max calibration

Sets OKLCH values for status (success/warning/danger/info/neutral × normal+muted),
privacy (private/join/aggregate/dimension/select), accent, surfaces, border, ring.
All values verified against WCAG AA contrast on warm-canvas + elevated-white.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A1)
Spec: docs/superpowers/specs/2026-05-26-hyve-platform-design.md §1.3, §7.7"
```

---

### Task A2: Add tokens to globals.css

**Files:**
- Modify: `src/app/globals.css` (or wherever the root token block lives — search if uncertain)

- [ ] **Step 1: Locate the current token block**

Run:
```bash
grep -rn "^:root\|@theme\|--bg:\|--surface:" src/app/globals.css src/styles/ 2>/dev/null | head -20
```

Confirm where the existing tokens live.

- [ ] **Step 2: Add the new tokens from the calibration doc**

Insert (using values from `docs/design-system/2026-05-26-color-calibration.md`) into the `:root` block:

```css
/* Hyve visual language — status verbs (text-color tokens) */
--status-success: oklch(...);
--status-success-muted: oklch(...);
--status-warning: oklch(...);
--status-warning-muted: oklch(...);
--status-danger: oklch(...);
--status-danger-muted: oklch(...);
--status-info: oklch(...);
--status-info-muted: oklch(...);
--status-neutral: oklch(...);
--status-neutral-muted: oklch(...);

/* Hyve visual language — privacy levels (text-color tokens) */
--privacy-private: oklch(...);
--privacy-join: oklch(...);
--privacy-aggregate: oklch(...);
--privacy-dimension: oklch(...);
--privacy-select: oklch(...);
```

- [ ] **Step 3: Verify the tokens are valid CSS**

Run:
```bash
pnpm build 2>&1 | grep -i "error" | head -5
```

Expected: no errors related to the new tokens.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(tokens): add status + privacy color tokens to globals.css

Eleven new CSS variables, all OKLCH, all text-color tokens. Used by the
forthcoming <Status>, <PrivacyLevel>, <Timestamp> primitives.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A2)"
```

---

### Task A3: Add the `<Status>` primitive

**Files:**
- Create: `src/components/ui/status.tsx`
- Create: `src/components/ui/status.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/ui/status.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Status } from "./status";

describe("Status", () => {
  it("renders the verb as inline text with the correct tone class", () => {
    render(<Status tone="success">Approved</Status>);
    const el = screen.getByText("Approved");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toMatch(/text-\[var\(--status-success\)\]|status-success/);
  });

  it("renders no decorative dot, pill, or border", () => {
    const { container } = render(<Status tone="danger">Rejected</Status>);
    // No nested span with rounded-full + bg- (the banned dot pattern).
    expect(container.querySelector("span.rounded-full")).toBeNull();
    // No border/fill chrome on the root span.
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/bg-|border|rounded-/);
  });

  it("supports all five tones", () => {
    const tones = ["success", "warning", "danger", "info", "neutral"] as const;
    for (const tone of tones) {
      const { unmount } = render(<Status tone={tone}>Test</Status>);
      expect(screen.getByText("Test")).toBeDefined();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run:
```bash
pnpm test src/components/ui/status.test.tsx
```

Expected: FAIL ("Cannot find module './status'").

- [ ] **Step 3: Implement the minimal `<Status>` component**

`src/components/ui/status.tsx`:
```tsx
type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<StatusTone, string> = {
  success: "text-[var(--status-success)]",
  warning: "text-[var(--status-warning)]",
  danger: "text-[var(--status-danger)]",
  info: "text-[var(--status-info)]",
  neutral: "text-[var(--status-neutral)]",
};

export function Status({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  return <span className={toneClass[tone]}>{children}</span>;
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run:
```bash
pnpm test src/components/ui/status.test.tsx
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/status.tsx src/components/ui/status.test.tsx
git commit -m "feat(ui): add <Status> primitive (replaces status-pill)

Typographic-only state verb. No dot, no pill, no border. Five tones via
text-color tokens.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A3)
Spec: §1.2"
```

---

### Task A4: Add the `<Timestamp>` primitive

**Files:**
- Create: `src/components/ui/timestamp.tsx`
- Create: `src/components/ui/timestamp.test.tsx`
- Create: `src/lib/utils/relative-time.ts` (helper)
- Create: `src/lib/utils/relative-time.test.ts`

- [ ] **Step 1: Write the failing test for `relativeTime`**

`src/lib/utils/relative-time.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { relativeTime, freshnessBucket } from "./relative-time";

describe("relativeTime", () => {
  const now = new Date("2026-05-26T12:00:00Z");

  it.each([
    [new Date("2026-05-26T11:59:00Z"), "1m ago"],
    [new Date("2026-05-26T10:00:00Z"), "2h ago"],
    [new Date("2026-05-25T12:00:00Z"), "1d ago"],
    [new Date("2026-05-20T12:00:00Z"), "6d ago"],
    [new Date("2026-05-10T12:00:00Z"), "16d ago"],
    [new Date("2026-02-26T12:00:00Z"), "3mo ago"],
    [new Date("2025-05-26T12:00:00Z"), "1y ago"],
  ])("renders %p as %s relative to now", (at, expected) => {
    expect(relativeTime(at, now)).toBe(expected);
  });
});

describe("freshnessBucket", () => {
  const now = new Date("2026-05-26T12:00:00Z");

  it("returns 'fresh' for ≤24h", () => {
    expect(freshnessBucket(new Date("2026-05-25T13:00:00Z"), now)).toBe("fresh");
  });

  it("returns 'recent' for 1–7d", () => {
    expect(freshnessBucket(new Date("2026-05-22T12:00:00Z"), now)).toBe("recent");
  });

  it("returns 'stale' for >7d", () => {
    expect(freshnessBucket(new Date("2026-05-15T12:00:00Z"), now)).toBe("stale");
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/utils/relative-time.test.ts
```

- [ ] **Step 3: Implement `relativeTime` + `freshnessBucket`**

`src/lib/utils/relative-time.ts`:
```ts
export type FreshnessBucket = "fresh" | "recent" | "stale";

export function relativeTime(at: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - at.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

export function freshnessBucket(at: Date, now: Date = new Date()): FreshnessBucket {
  const diffMs = now.getTime() - at.getTime();
  const day = diffMs / (1000 * 60 * 60 * 24);
  if (day <= 1) return "fresh";
  if (day <= 7) return "recent";
  return "stale";
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/utils/relative-time.test.ts
```

- [ ] **Step 5: Write the `<Timestamp>` test**

`src/components/ui/timestamp.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Timestamp } from "./timestamp";

describe("Timestamp", () => {
  const now = new Date("2026-05-26T12:00:00Z");

  it("renders relative time as inline text", () => {
    render(<Timestamp at={new Date("2026-05-26T10:00:00Z")} now={now} />);
    expect(screen.getByText("2h ago")).toBeDefined();
  });

  it("tints fresh timestamps with success-muted", () => {
    const { container } = render(<Timestamp at={new Date("2026-05-26T11:30:00Z")} now={now} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/status-success-muted/);
  });

  it("tints stale timestamps with danger-muted", () => {
    const { container } = render(<Timestamp at={new Date("2026-05-10T12:00:00Z")} now={now} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/status-danger-muted/);
  });

  it("renders no decorative dot", () => {
    const { container } = render(<Timestamp at={new Date("2026-05-26T11:00:00Z")} now={now} />);
    expect(container.querySelector("span.rounded-full")).toBeNull();
  });
});
```

- [ ] **Step 6: Implement `<Timestamp>`**

`src/components/ui/timestamp.tsx`:
```tsx
import { relativeTime, freshnessBucket } from "@/lib/utils/relative-time";

const bucketClass = {
  fresh: "text-[var(--status-success-muted)]",
  recent: "text-[var(--status-neutral-muted)]",
  stale: "text-[var(--status-danger-muted)]",
} as const;

export function Timestamp({ at, now }: { at: Date; now?: Date }) {
  const ref = now ?? new Date();
  const text = relativeTime(at, ref);
  const cls = bucketClass[freshnessBucket(at, ref)];
  return (
    <span className={cls} title={at.toISOString()}>
      {text}
    </span>
  );
}
```

- [ ] **Step 7: Run test, confirm pass + commit**

```bash
pnpm test src/components/ui/timestamp.test.tsx src/lib/utils/relative-time.test.ts
git add src/components/ui/timestamp.tsx src/components/ui/timestamp.test.tsx src/lib/utils/relative-time.ts src/lib/utils/relative-time.test.ts
git commit -m "feat(ui): add <Timestamp> primitive + relativeTime utility

Tinted relative timestamps. ≤24h muted-success, 1–7d muted-neutral, >7d
muted-danger. No dot. Absolute ISO time on hover via title attr.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A4)
Spec: §1.2"
```

---

### Task A5: Add the `<PrivacyLevel>` primitive

**Files:**
- Create: `src/components/ui/privacy-level.tsx`
- Create: `src/components/ui/privacy-level.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PrivacyLevel } from "./privacy-level";

describe("PrivacyLevel", () => {
  it.each([
    ["private", "privacy-private"],
    ["join", "privacy-join"],
    ["aggregate", "privacy-aggregate"],
    ["dimension", "privacy-dimension"],
    ["select", "privacy-select"],
  ] as const)("level=%s uses token --%s", (level, token) => {
    const { container } = render(<PrivacyLevel level={level} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(new RegExp(token));
    expect(el.textContent).toBe(level);
  });

  it("renders abbreviated when abbreviated=true", () => {
    render(<PrivacyLevel level="aggregate" abbreviated />);
    expect(screen.getByText("agg")).toBeDefined();
  });

  it("renders no chip / no fill / no border", () => {
    const { container } = render(<PrivacyLevel level="private" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toMatch(/bg-|border|rounded-/);
  });
});
```

- [ ] **Step 2: Implement**

`src/components/ui/privacy-level.tsx`:
```tsx
export type PrivacyLevelValue =
  | "private"
  | "join"
  | "aggregate"
  | "dimension"
  | "select";

const tokenClass: Record<PrivacyLevelValue, string> = {
  private: "text-[var(--privacy-private)]",
  join: "text-[var(--privacy-join)]",
  aggregate: "text-[var(--privacy-aggregate)]",
  dimension: "text-[var(--privacy-dimension)]",
  select: "text-[var(--privacy-select)]",
};

const abbrev: Record<PrivacyLevelValue, string> = {
  private: "prv",
  join: "jn",
  aggregate: "agg",
  dimension: "dim",
  select: "sel",
};

export function PrivacyLevel({
  level,
  abbreviated = false,
}: {
  level: PrivacyLevelValue;
  abbreviated?: boolean;
}) {
  return (
    <span className={tokenClass[level]}>
      {abbreviated ? abbrev[level] : level}
    </span>
  );
}
```

- [ ] **Step 3: Test, commit**

```bash
pnpm test src/components/ui/privacy-level.test.tsx
git add src/components/ui/privacy-level.tsx src/components/ui/privacy-level.test.tsx
git commit -m "feat(ui): add <PrivacyLevel> primitive (replaces privacy-chip)

Inline colored text for the five levels. Abbreviated mode (prv/jn/agg/dim/sel)
for dense surfaces like the Analysis builder schema sidebar.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A5)
Spec: §1.2, §5.3"
```

---

### Task A6: Add `<Section>` + `<Disabled>` + `<ResourceCard>`

**Files:**
- Create: `src/components/ui/section.tsx` + test
- Create: `src/components/ui/disabled.tsx` + test
- Create: `src/components/ui/resource-card.tsx` + test

- [ ] **Step 1: `<Section>` — write test + implementation**

`src/components/ui/section.tsx`:
```tsx
export function Section({ children }: { children: React.ReactNode }) {
  return <section className="mt-8 first:mt-0">{children}</section>;
}
```

Test verifies it renders a `<section>` with the spacing class and contains children. No eyebrow rendering.

- [ ] **Step 2: `<Disabled>` — write test + implementation**

`src/components/ui/disabled.tsx`:
```tsx
"use client";

import { useRouter, usePathname } from "next/navigation";

export function Disabled({
  children,
  reason = "Sign in to use",
  href = "/login",
}: {
  children: React.ReactNode;
  reason?: string;
  href?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  return (
    <button
      type="button"
      aria-disabled
      aria-label={reason}
      title={reason}
      onClick={() => router.push(`${href}?returnTo=${encodeURIComponent(path)}`)}
      className="text-[var(--status-neutral-muted)] cursor-not-allowed hover:text-[var(--status-neutral)] transition-colors"
    >
      {children}
    </button>
  );
}
```

Test verifies: renders as a button, has `aria-disabled` + `title`, clicking routes to login with `returnTo` set.

- [ ] **Step 3: `<ResourceCard>` — write test + implementation**

`src/components/ui/resource-card.tsx`:
```tsx
import Link from "next/link";

export function ResourceCard({
  title,
  description,
  cta,
  href,
}: {
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md p-5 transition-colors hover:bg-[var(--surface)]"
    >
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 text-sm text-[var(--status-neutral-muted)]">
        {description}
      </p>
      <span className="mt-3 inline-block text-sm text-[var(--accent)]">
        {cta} →
      </span>
    </Link>
  );
}
```

Test verifies: renders title in h3, description, CTA with arrow, links to href. No illustration. No fill (only hover background tint).

- [ ] **Step 4: Test all three primitives**

```bash
pnpm test src/components/ui/section.test.tsx src/components/ui/disabled.test.tsx src/components/ui/resource-card.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/section.* src/components/ui/disabled.* src/components/ui/resource-card.*
git commit -m "feat(ui): add <Section>, <Disabled>, <ResourceCard> primitives

- <Section> — semantic wrapper with consistent vertical spacing
- <Disabled> — anon-visible sidebar item; click routes to /login?returnTo=
- <ResourceCard> — Home-page card (title + description + verb CTA, no illustration)

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A6)
Spec: §1.2, §2.7"
```

---

### Task A7: Migrate `vault-detail/privacy.tsx`

**Files:**
- Modify: `src/components/v2/features/vault-detail/privacy.tsx`
- Update any imports across the codebase

- [ ] **Step 1: Read the current file**

```bash
cat src/components/v2/features/vault-detail/privacy.tsx
```

Identify the `PRIVACY_TONE` map + the `bg-v2-foreground/40`-style dot definitions + any decorative dot rendering.

- [ ] **Step 2: Replace dot-based rendering with `<PrivacyLevel>`**

Remove the `PRIVACY_TONE` map. Replace any `<span className="h-1 w-1 rounded-full ...">` followed by privacy text with `<PrivacyLevel level={...} />`. If the component re-exports a `PrivacyChip`, change its implementation to delegate to `<PrivacyLevel>`.

If the file is no longer needed (just chip/dot rendering), mark it for deletion in Task A9.

- [ ] **Step 3: Update consumers**

```bash
grep -rn "from .*vault-detail/privacy" src/ | head -20
```

For each consumer, change imports from `PRIVACY_TONE` to `<PrivacyLevel>` per spec §1.2 usage.

- [ ] **Step 4: Run lint, typecheck, tests, build**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: clean for the modified files. Existing offenders in other files are still expected to be flagged — that's fine.

- [ ] **Step 5: Visual review via ui-design-reviewer**

Dispatch `ui-design-reviewer` with a Playwright screenshot of `/vaults/[id]` (use a fixture vault). Verify visually no decorative dots remain on the privacy display.

- [ ] **Step 6: Commit**

```bash
git add src/components/v2/features/vault-detail/privacy.tsx
git add src/  # also pick up consumer updates
git commit -m "refactor(vault-detail): replace privacy dots with <PrivacyLevel>

Removes the PRIVACY_TONE dot map. Privacy levels now render as inline
colored text per the typographic rule.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A7)
Spec: §1, §3.3"
```

---

### Task A8: Migrate `vault-detail/access-panel.tsx` + `dataset-detail-page.tsx`

**Files:**
- Modify: `src/components/v2/features/vault-detail/access-panel.tsx`
- Modify: `src/components/v2/features/vault-detail/dataset-detail-page.tsx`

- [ ] **Step 1: Read both files**

```bash
cat src/components/v2/features/vault-detail/access-panel.tsx
cat src/components/v2/features/vault-detail/dataset-detail-page.tsx
```

Identify:
- Eyebrow patterns (`text-[10px] uppercase tracking-[0.12em]`)
- `StatusPill` usages
- `PrivacyChip` usages
- `// ── Section ──` JSX comment dividers
- Any other banned patterns surfaced by ESLint warnings

- [ ] **Step 2: Replace eyebrow patterns with semantic headings**

Convert `<span className="text-[10px] uppercase tracking-[0.12em]">SECTION NAME</span>` to a normal `<h3>` with appropriate weight + muted color (use `text-base font-medium text-[var(--status-neutral)]` or similar). No tracking. No uppercase.

If the original eyebrow was *not* labeling a section but ornamenting one (e.g., inside a card header that already has a real heading), delete it entirely.

- [ ] **Step 3: Replace StatusPill with `<Status>`**

```tsx
// Before
<StatusPill tone="success">Approved</StatusPill>

// After
import { Status } from "@/components/ui/status";
<Status tone="success">Approved</Status>
```

- [ ] **Step 4: Replace PrivacyChip with `<PrivacyLevel>`**

Same pattern as A7. If the chip was inside a table cell, the cell now contains plain `<PrivacyLevel>` text.

- [ ] **Step 5: Delete `// ── Section ──` JSX comment dividers**

Pure deletion. They're cosmetic and pollute readability.

- [ ] **Step 6: Visual review + commit**

Dispatch `ui-design-reviewer` on the affected routes. Confirm no eyebrow, no chip, no dot remains.

```bash
pnpm lint
pnpm typecheck
pnpm test
git add src/components/v2/features/vault-detail/access-panel.tsx src/components/v2/features/vault-detail/dataset-detail-page.tsx
git commit -m "refactor(vault-detail): purge banned chrome from access-panel + dataset-detail

Eyebrow labels → semantic headings. StatusPill → <Status>. PrivacyChip →
<PrivacyLevel>. Comment-divider JSX deleted.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A8)"
```

---

### Task A9: Sweep all remaining offenders, then delete `status-pill.tsx` + `privacy-chip.tsx`

**Files:**
- Read: `docs/superpowers/plans/2026-05-26-governance-foundation-offenders.txt` (output from Plan 1 Task 12)
- Modify: every file in that list
- Delete: `src/components/v2/ui/status-pill.tsx`
- Delete: `src/components/v2/ui/privacy-chip.tsx`

- [ ] **Step 1: Read the offender list from Plan 1**

```bash
cat docs/superpowers/plans/2026-05-26-governance-foundation-offenders.txt
```

If the file doesn't exist (Plan 1 didn't capture it), regenerate:
```bash
pnpm lint 2>&1 | grep -E "banned|Eyebrow pattern|Decorative dot pattern" | sort -u > /tmp/offenders.txt
```

- [ ] **Step 2: For each file in the list, migrate to primitives**

Same migrations as Tasks A7 + A8. Group by anti-pattern, do all files with eyebrows in one commit, all status-pill consumers in another, etc.

This is parallelizable: dispatch one `ui-component-dev` agent per group. Each agent reads the visual-language rules + hyve-visual-language skill before working.

- [ ] **Step 3: Confirm no remaining imports of banned primitives**

```bash
grep -rn "status-pill\|privacy-chip" src/ --include="*.tsx" --include="*.ts" | grep -v "v2/ui/status-pill\|v2/ui/privacy-chip"
```

Expected: empty.

- [ ] **Step 4: Delete the banned primitive files**

```bash
rm src/components/v2/ui/status-pill.tsx
rm src/components/v2/ui/privacy-chip.tsx
# Plus any test files alongside them
```

- [ ] **Step 5: Run full build to confirm clean**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all pass. No reference to the deleted files.

- [ ] **Step 6: Promote ESLint rules from `warn` to `error`**

In `eslint.config.mjs`, change the `no-restricted-syntax` severity for the eyebrow + dot regex from `"warn"` to `"error"`. Run `pnpm lint` to confirm zero violations.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): delete status-pill + privacy-chip; promote ESLint rules to error

All consumers migrated to <Status> and <PrivacyLevel>. ESLint
no-restricted-syntax rules for eyebrow + dot patterns promoted from warn
to error.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (A9)"
```

---

### Phase A checkpoint

Before moving to Phase B:

- [ ] All six primitives exist with tests passing
- [ ] Color palette is calibrated and documented
- [ ] `status-pill.tsx` and `privacy-chip.tsx` are deleted
- [ ] No banned patterns remain (lint passes at error severity)
- [ ] `pnpm build` clean
- [ ] Dispatch `ui-design-reviewer` to take a screenshot tour of the existing routes — confirm visual consistency

---

## Phase B — Unified shell + identity model

After this phase, the platform has a real identity layer (fixture-backed for MVP), a single shell that adapts per role, and the `/login` + `/onboarding` flows pick up the role-selection step.

### Task B1: Session + role helpers

**Files:**
- Create: `src/lib/auth/session.ts` + test
- Create: `src/lib/auth/fixtures.ts` (MVP identity data)
- Create: `src/lib/auth/role-gate.tsx` + test
- Create: `src/lib/auth/require-role.ts`

- [ ] **Step 1: Define session types + fixture**

`src/lib/auth/session.ts`:
```ts
import { cookies } from "next/headers";
import { getFixtureUser } from "./fixtures";

export type Role = "owner" | "curator";
export type User = { id: string; name: string; email: string; roles: Role[] };
export type Session = { user: User; roles: Role[] };

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const userId = c.get("hyve_user_id")?.value;
  if (!userId) return null;
  const user = getFixtureUser(userId);
  if (!user) return null;
  return { user, roles: user.roles };
}
```

`src/lib/auth/fixtures.ts`:
```ts
import type { User } from "./session";

const FIXTURE_USERS: User[] = [
  { id: "owner-1", name: "Apollo Test", email: "apollo@example.com", roles: ["owner"] },
  { id: "curator-1", name: "Gauntlet Test", email: "gauntlet@example.com", roles: ["curator"] },
  { id: "both-1", name: "Multi Role", email: "both@example.com", roles: ["owner", "curator"] },
  { id: "exploring-1", name: "Just Exploring", email: "explore@example.com", roles: [] },
];

export function getFixtureUser(id: string): User | undefined {
  return FIXTURE_USERS.find((u) => u.id === id);
}

export function listFixtureUsers(): User[] {
  return FIXTURE_USERS;
}
```

- [ ] **Step 2: Implement `requireRole` for server components**

`src/lib/auth/require-role.ts`:
```ts
import { redirect } from "next/navigation";
import { getSession, type Role } from "./session";

export async function requireRole(role: Role) {
  const session = await getSession();
  if (!session || !session.roles.includes(role)) {
    redirect(`/login?returnTo=${encodeURIComponent(globalThis.location?.pathname ?? "/")}`);
  }
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
```

- [ ] **Step 3: Implement `<RoleGate>` client component**

`src/lib/auth/role-gate.tsx`:
```tsx
"use client";

import type { Role } from "./session";

export function RoleGate({
  role,
  userRoles,
  fallback = null,
  children,
}: {
  role: Role;
  userRoles: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!userRoles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
```

- [ ] **Step 4: Tests**

Test session reads from cookie, returns null when no cookie, returns user when fixture matches. Test `<RoleGate>` shows children when role present, fallback when absent.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/
git commit -m "feat(auth): add session + role helpers (fixture-backed MVP)

getSession() reads hyve_user_id cookie → fixture user. requireRole(role)
+ requireAuth() helpers for server components. <RoleGate> for client gating.

Plan: docs/superpowers/plans/2026-05-26-hyve-platform-build.md (B1)
Spec: §2.4, §2.5"
```

---

### Task B2: Login + role-picker onboarding

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/onboarding/page.tsx`
- Create: `src/app/(auth)/login/login-form.tsx`
- Create: Server Action `src/app/(auth)/login/actions.ts`

- [ ] **Step 1: Replace login form to use fixture users**

For MVP, login is a fixture picker: select which user to sign in as. Production replaces this with real auth.

`src/app/(auth)/login/login-form.tsx` (Client Component): renders a list of fixture users + a "Sign in as anon" link (clears cookie). Each user click triggers the Server Action.

`src/app/(auth)/login/actions.ts` (Server Action):
```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFixtureUser } from "@/lib/auth/fixtures";

export async function signInAs(userId: string, returnTo: string = "/") {
  const user = getFixtureUser(userId);
  if (!user) return;
  const c = await cookies();
  c.set("hyve_user_id", user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(returnTo);
}

export async function signOut() {
  const c = await cookies();
  c.delete("hyve_user_id");
  redirect("/");
}
```

`src/app/(auth)/login/page.tsx` reads the `returnTo` search param + renders `<LoginForm returnTo={returnTo} />`.

- [ ] **Step 2: Add role-picker step to onboarding**

`src/app/(auth)/onboarding/page.tsx` — after the user signs in via fixture (or is authenticated but has no roles), the onboarding page prompts:

```
What brings you to Hyve?

  ○ Manage data           → grants 'owner' role
  ○ Build analyses        → grants 'curator' role
  ○ Both                  → grants both roles
  ○ Just exploring        → grants no roles (user can upgrade later)

  [Continue →]
```

Server action `grantRoles(roles: Role[])` updates the fixture user's roles (for MVP, mutate the in-memory fixture array; for production this would persist to backend).

After Continue → redirect to `/` (which routes per role: owner → Owner Home, curator → Curator Home, both → Owner Home, exploring → public Home).

- [ ] **Step 3: Wire visual-language rules**

The login form + onboarding picker use only typographic primitives. Radio buttons are native (accessible). No status pills.

- [ ] **Step 4: Test E2E**

`tests/e2e/auth-flow.spec.ts`: navigate to /login, click a fixture user, expect redirect to /, expect role-appropriate sidebar items visible. Sign out → cookie cleared, back to anon shell.

- [ ] **Step 5: Commit**

Standard task commit referencing B2 + spec §2.4.

---

### Task B3: Sidebar items, role-additive, anon disabled

**Files:**
- Modify: `src/components/v2/shell/v2-sidebar.tsx` (existing)
- Modify: `src/components/v2/shell/v2-shell.tsx` (existing)
- Create: `src/components/v2/shell/sidebar-items.ts` (data model)

- [ ] **Step 1: Define the sidebar item data model**

`src/components/v2/shell/sidebar-items.ts`:
```ts
import type { Role } from "@/lib/auth/session";

export type SidebarItem = {
  label: string;
  href: string;
  roles: "universal" | Role[];  // 'universal' = visible to everyone (active for all)
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  // Universal
  { label: "Explore", href: "/explore", roles: "universal" },
  { label: "Search", href: "/search", roles: "universal" },
  { label: "Verify", href: "/verify", roles: "universal" },

  // Owner items
  { label: "Home", href: "/", roles: ["owner"] },
  { label: "Vaults", href: "/vaults", roles: ["owner"] },
  { label: "Sources", href: "/sources", roles: ["owner"] },
  { label: "Proposals", href: "/proposals", roles: ["owner"] },
  { label: "Audit", href: "/audit", roles: ["owner"] },

  // Curator items
  { label: "Home", href: "/cp", roles: ["curator"] },
  { label: "Browse Vaults", href: "/cp/vaults", roles: ["curator"] },
  { label: "My Analyses", href: "/cp/analyses", roles: ["curator"] },
  { label: "Executions", href: "/cp/executions", roles: ["curator"] },
];

export function isItemActive(item: SidebarItem, userRoles: Role[], isAnon: boolean): "active" | "disabled" | "hidden" {
  if (item.roles === "universal") return "active";
  const hasRole = item.roles.some((r) => userRoles.includes(r));
  if (hasRole) return "active";
  if (isAnon) return "disabled";  // Anon sees role items disabled
  return "hidden";                 // Authed users without role don't see them
}
```

- [ ] **Step 2: Modify the existing sidebar to use this model**

In `v2-sidebar.tsx`: accept `session` prop. Iterate `SIDEBAR_ITEMS`. For each, compute state via `isItemActive`. Render:
- `active` → normal `<Link>`
- `disabled` → `<Disabled>` from `@/components/ui/disabled`
- `hidden` → render nothing

Group items by section using simple spacing (no eyebrow labels). A 16px gap between groups + a 1px divider line is the grouping mechanism.

- [ ] **Step 3: Plumb session into the layout**

The shell is rendered in `(originator)/layout.tsx` (per earlier exploration). Modify the layout to call `getSession()` server-side, pass session to `<V2Shell>`, which passes to `<V2Sidebar>`. Anon visitors get `session = null` → sidebar renders with all role items as `<Disabled>`.

- [ ] **Step 4: Visual + a11y review**

Dispatch `ui-design-reviewer` for screenshot. Dispatch `accessibility-auditor` for tab-navigation + `aria-disabled` + skip-link checks.

- [ ] **Step 5: Commit + E2E test**

`tests/e2e/sidebar-roles.spec.ts`: 
- Visit `/` as anon → expect Explore/Search/Verify active, others disabled with title attr "Sign in to use".
- Sign in as owner → expect owner items active, curator items hidden.
- Sign in as curator → expect curator items active, owner items hidden.
- Sign in as both-roles → expect all items active.

---

### Task B4: Anon-accessible vs auth-gated route enforcement

**Files:**
- Modify: `src/middleware.ts` (or create if missing)
- Modify: each anon-accessible page to omit `requireAuth()`
- Modify: each auth-gated page to call `requireAuth()` / `requireRole()`

- [ ] **Step 1: Check existing middleware**

```bash
test -f src/middleware.ts && cat src/middleware.ts || echo "No middleware exists"
```

- [ ] **Step 2: Create or update middleware**

`src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";

const ANON_PATHS = ["/explore", "/attestation", "/vault", "/verify", "/search", "/login", "/onboarding"];

export function middleware(req: NextRequest) {
  // For MVP, middleware is permissive. Server components handle role gating
  // via requireRole(). This middleware only handles top-level redirects.
  const pathname = req.nextUrl.pathname;
  if (pathname === "/_sign-out") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    const res = NextResponse.redirect(url);
    res.cookies.delete("hyve_user_id");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|css|js)).*)"],
};
```

- [ ] **Step 3: Audit pages for auth requirements**

For each route under `/vaults`, `/sources`, `/audit`, `/proposals`, `/datasets`, `/schemas`, `/cp/*`, `/settings`: add `await requireAuth()` at the top of the page component. Add `await requireRole('owner')` to owner-only routes, `requireRole('curator')` to curator-only.

For each route at `/explore`, `/attestation/[id]`, `/vault/[id]` (singular), `/verify`, `/search`, `/login`, `/onboarding`: do NOT add auth requirements.

- [ ] **Step 4: E2E test**

Test that visiting `/vaults` as anon redirects to `/login?returnTo=/vaults`. Test that visiting `/explore` as anon renders successfully.

- [ ] **Step 5: Commit**

---

### Phase B checkpoint

- [ ] `getSession()` works; cookies set on login, cleared on signout
- [ ] Sidebar adapts per role (anon disabled, single-role hides the other, multi-role shows union)
- [ ] Auth gates work (anon redirected to /login with returnTo)
- [ ] Onboarding role picker grants roles to the fixture user
- [ ] Visual + a11y reviews pass

---

## Phase C — Home pages (Stripe/Plaid shape)

After this phase, the Owner Home and Curator Home render the onboarding-checklist-plus-resource-cards shape from §2.7.

### Task C1: Onboarding checklist primitive

**Files:**
- Create: `src/components/ui/onboarding-checklist.tsx` + test

- [ ] **Step 1: Write the test**

Test renders 5 items with states (done / in-progress / locked). Verifies:
- Done items have a filled circle mark and muted strikethrough OR muted color
- In-progress item has an outlined circle, normal weight, with a CTA button
- Locked items have a muted/empty circle and muted text, no CTA
- "X of Y complete" text in the header is right-aligned and muted

- [ ] **Step 2: Implement**

```tsx
export type ChecklistItem = {
  label: string;
  state: "done" | "in-progress" | "locked";
  cta?: { label: string; href: string };
};

export function OnboardingChecklist({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const doneCount = items.filter((i) => i.state === "done").length;
  return (
    <section className="rounded-md border border-[var(--border)] p-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-medium">{title}</h2>
        <span className="text-sm text-[var(--status-neutral-muted)]">
          {doneCount} of {items.length} complete
        </span>
      </header>
      <ol className="mt-6 space-y-3">
        {items.map((item, idx) => (
          <ChecklistRow key={idx} index={idx + 1} item={item} />
        ))}
      </ol>
    </section>
  );
}

function ChecklistRow({ index, item }: { index: number; item: ChecklistItem }) {
  const mark =
    item.state === "done" ? "●" : item.state === "in-progress" ? "○" : "◌";
  const text =
    item.state === "locked"
      ? "text-[var(--status-neutral-muted)]"
      : item.state === "done"
      ? "text-[var(--status-neutral-muted)] line-through"
      : "";
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className="w-4 text-[var(--status-neutral)]">{mark}</span>
      <span className={text}>
        {index}. {item.label}
      </span>
      {item.cta && item.state === "in-progress" && (
        <a
          href={item.cta.href}
          className="ml-auto rounded-md border border-[var(--accent)] px-3 py-1 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/5"
        >
          {item.cta.label}
        </a>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Test + commit**

---

### Task C2: Owner Home page

**Files:**
- Modify: `src/app/(originator)/page.tsx` (existing route)
- Create: `src/components/features/home/owner-home.tsx`
- Create: `src/lib/onboarding/owner-progress.ts` (computes step states)

- [ ] **Step 1: Write owner-progress computation**

```ts
import type { Session } from "@/lib/auth/session";

export type OwnerOnboardingProgress = {
  orgVerified: boolean;
  hasSource: boolean;
  hasVault: boolean;
  hasSchemaConfigured: boolean;
  hasApprovedAnalysis: boolean;
};

export async function getOwnerProgress(session: Session): Promise<OwnerOnboardingProgress> {
  // MVP: pull from fixtures. Later: backend.
  // For now, derive from the existing fixture data layer (sources, vaults, etc.)
  // ...
}
```

- [ ] **Step 2: Owner Home component**

```tsx
import { Section } from "@/components/ui/section";
import { OnboardingChecklist, type ChecklistItem } from "@/components/ui/onboarding-checklist";
import { ResourceCard } from "@/components/ui/resource-card";
import type { Session } from "@/lib/auth/session";
import type { OwnerOnboardingProgress } from "@/lib/onboarding/owner-progress";

export function OwnerHome({
  session,
  progress,
}: {
  session: Session;
  progress: OwnerOnboardingProgress;
}) {
  const items: ChecklistItem[] = [
    { label: "Verify your organization", state: progress.orgVerified ? "done" : "in-progress", cta: { label: "Start", href: "/settings/organization" } },
    { label: "Connect your first source", state: progress.hasSource ? "done" : progress.orgVerified ? "in-progress" : "locked", cta: { label: "Start", href: "/sources/new" } },
    { label: "Create your first vault", state: progress.hasVault ? "done" : progress.hasSource ? "in-progress" : "locked", cta: { label: "Start", href: "/vaults/new" } },
    { label: "Define schema + privacy posture", state: progress.hasSchemaConfigured ? "done" : progress.hasVault ? "in-progress" : "locked" },
    { label: "Approve your first Analysis", state: progress.hasApprovedAnalysis ? "done" : "locked" },
  ];

  const fullyOnboarded = progress.hasApprovedAnalysis;

  return (
    <>
      <h1 className="text-2xl">Hi, {session.user.name.split(" ")[0]}. Welcome to Hyve.</h1>

      <Section>
        <OnboardingChecklist title="Get your first vault verified" items={items} />
      </Section>

      <Section>
        <h2 className="text-xl font-medium">Explore</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ResourceCard title="Quickstart" description="Hyve in 5 minutes" cta="Read" href="/docs/quickstart" />
          <ResourceCard title="Schema templates" description="Loan tape, NAV, reserves, ledger" cta="Browse" href="/docs/schema-templates" />
          <ResourceCard title="Privacy posture" description="How each level shapes what curators query" cta="Learn" href="/docs/privacy" />
        </div>
      </Section>

      {fullyOnboarded && (
        <Section>
          {/* "Today's signal" line — single line of prose */}
          <p className="text-sm text-[var(--status-neutral-muted)]">
            {/* fetch live signal from API */}
            Today's signal · 3 active vaults · 1 proposal awaiting your decision · last execution 14m ago
          </p>
        </Section>
      )}
    </>
  );
}
```

- [ ] **Step 3: Page wrapper**

`src/app/(originator)/page.tsx`:
```tsx
import { requireRole } from "@/lib/auth/require-role";
import { getOwnerProgress } from "@/lib/onboarding/owner-progress";
import { OwnerHome } from "@/components/features/home/owner-home";

export default async function HomePage() {
  const session = await requireRole("owner");
  const progress = await getOwnerProgress(session);
  return <OwnerHome session={session} progress={progress} />;
}
```

- [ ] **Step 4: Visual + commit**

Dispatch `ui-design-reviewer` to take a Playwright screenshot and verify the Owner Home matches §2.7. Specifically check: no chips, no progress bars, no pulsing dots, no eyebrow labels.

---

### Task C3: Curator Home page

**Files:**
- Modify: `src/app/(counterparty)/cp/page.tsx`
- Create: `src/components/features/home/curator-home.tsx`
- Create: `src/lib/onboarding/curator-progress.ts`

Mirror of Task C2 but with the curator checklist:
1. Verify your organization
2. Browse vaults (CTA: Browse → /cp/vaults)
3. Author your first Analysis
4. Get your first execution + attestation

Resource cards: Sandbox vault / SQL templates / Privacy posture.

"Recent activity" line only after first execution.

Standard test + commit.

---

### Phase C checkpoint

- [ ] Owner Home renders the checklist + cards + signal line per §2.7
- [ ] Curator Home renders the curator equivalent
- [ ] Visual review passes (no banned chrome)
- [ ] Checklist states reflect actual fixture data
- [ ] Resource cards link to placeholder doc routes (the routes can 404 for now — they're out of scope)

---

## Phase D — Public Verification flow

Five new anon-accessible routes. After this phase, anon visitors can browse the attestation feed, open details, verify proofs, browse public vault profiles, and search.

### Task D1: Attestation fixture data

**Files:**
- Create: `src/lib/api/fixtures/attestations.ts`
- Create: `src/lib/api/schemas.ts` (or extend existing)

- [ ] **Step 1: Define the Zod schema**

```ts
import { z } from "zod";

export const AttestationSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  vaultName: z.string(),
  issuerName: z.string(),
  assetName: z.string(),
  analysisType: z.string(),
  resultSummary: z.string().optional(),  // undefined if private
  isPublic: z.boolean(),
  curatorName: z.string().optional(),
  curatorConsented: z.boolean(),
  enclaveType: z.literal("aws-nitro-enclave"),
  enclaveHash: z.string(),
  dataIntegrityHash: z.string(),
  ingestedAt: z.string(),  // ISO
  executedAt: z.string(),  // ISO
});

export type Attestation = z.infer<typeof AttestationSchema>;
```

- [ ] **Step 2: Create the fixture data**

`src/lib/api/fixtures/attestations.ts` — 30–50 fixture attestations across 5–8 fixture vaults, mix of public/private, mix of fresh/recent/stale.

- [ ] **Step 3: Fetcher helpers**

```ts
export async function listAttestations(filter?: { vaultId?: string; isPublic?: boolean }): Promise<Attestation[]> { /* ... */ }
export async function getAttestation(id: string): Promise<Attestation | null> { /* ... */ }
```

- [ ] **Step 4: Test + commit**

---

### Task D2: `/explore` route — attestation feed

**Files:**
- Create: `src/app/explore/page.tsx`
- Create: `src/app/explore/explore-feed.tsx` (client, polls)
- Create: `src/components/features/explore/attestation-row.tsx`

- [ ] **Step 1: Build the static row component**

`<AttestationRow>` — given an Attestation, renders:
```tsx
<div className="border-b border-[var(--border)] py-4 hover:bg-[var(--surface)]">
  <h3 className="text-base font-medium">
    {issuerName} · {assetName} · {analysisType}
  </h3>
  <div className="mt-1 flex items-baseline justify-between text-sm">
    <span className="text-[var(--status-neutral)]">
      {isPublic ? resultSummary : "Result private"}
    </span>
    <Timestamp at={new Date(executedAt)} />
  </div>
  {/* View attestation link visible on hover only */}
  <a href={`/attestation/${id}`} className="mt-1 hidden text-sm text-[var(--accent)] group-hover:inline">
    View attestation →
  </a>
</div>
```

- [ ] **Step 2: Page + client-polling feed**

`src/app/explore/page.tsx` (Server Component):
```tsx
import { listAttestations } from "@/lib/api/fixtures/attestations";
import { ExploreFeed } from "./explore-feed";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const initial = await listAttestations({ isPublic: true });
  return <ExploreFeed initial={initial} />;
}
```

`src/app/explore/explore-feed.tsx` (Client Component):
- Uses SWR with `refreshInterval: 30000`
- Renders header (stats line) + filters (selects, no chips) + rows
- New rows fade in at 200ms opacity (CSS animation, no slide)

- [ ] **Step 3: Stats line + filters**

Stats line: "X attestations · Y active vaults · Z verified assets" — plain text, no chips. Filters as native `<select>` or shadcn `<Select>` (already installed).

- [ ] **Step 4: E2E test + visual review**

`tests/e2e/explore.spec.ts`: navigate as anon, expect feed to render, expect at least one row, expect "View attestation →" hover affordance. No `.rounded-full.bg-*` decorative dots.

- [ ] **Step 5: Commit**

---

### Task D3: `/attestation/[id]` route — attestation detail + proof verifier

**Files:**
- Create: `src/app/attestation/[id]/page.tsx`
- Create: `src/components/features/attestation/proof-verifier.tsx` (client)
- Create: `src/lib/proof/verify-attestation.ts` (client-side verification logic)

- [ ] **Step 1: Implement client-side proof verification**

`src/lib/proof/verify-attestation.ts`:
```ts
import type { Attestation } from "@/lib/api/schemas";

export type ProofVerificationResult =
  | { valid: true; checks: string[] }
  | { valid: false; failedCheck: string; explanation: string };

export async function verifyAttestation(att: Attestation): Promise<ProofVerificationResult> {
  // MVP: deterministic checks based on fixture hashes.
  // Real implementation: validate AWS Nitro Enclave attestation document, signature chain, PCR values.
  if (!att.enclaveHash.startsWith("0x")) {
    return { valid: false, failedCheck: "Enclave hash format", explanation: "Enclave hash does not match the expected format." };
  }
  // ...
  return {
    valid: true,
    checks: [
      "Attestation generated by genuine AWS Nitro Enclave",
      "Data at query time matched the data as originally ingested",
      "Query result is mathematically consistent with the enclave output",
      "Signature chain is intact",
    ],
  };
}
```

- [ ] **Step 2: Build the page**

`src/app/attestation/[id]/page.tsx`:
- Fetch attestation by id (server)
- Render header (issuer · asset, analysis type · executedAt absolute)
- Prominent "Verify proof" button (client component → triggers verification)
- Structured fields per spec §3.2 (Result, Vault, Curator, Analysis type, Computation proof block, Data integrity block, Lineage)
- "More attestations from this vault" — listAttestations filtered by vaultId

- [ ] **Step 3: Visual + E2E**

E2E: navigate to fixture attestation, click "Verify proof", expect green text + four check marks (typographic only, no animation).

- [ ] **Step 4: Commit**

---

### Task D4: `/vault/[id]` route — public read-only profile

**Files:**
- Create: `src/app/vault/[id]/page.tsx` (singular, anon)
- Create: `src/components/features/vault-public/public-vault-profile.tsx`

Distinct from existing `/vaults/[id]` (plural, owner controls).

- [ ] **Step 1: Build the profile component**

Render header (vault name + asset name + asset type), aggregate stats line ("47 attestations · last 2h ago · queried by 6 curators"), schema preview table (column / type / `<PrivacyLevel>` / one-line consequence), recent public attestations rows, "Verified by" curator list, lineage line.

"Request to query" button — for anon, routes to `/login?returnTo=...&hint=curator`. For authed curator, opens an access-request modal (deferred to Phase F if not needed for MVP).

- [ ] **Step 2: E2E**

E2E test: anon navigates to `/vault/[fixture-id]`, expects schema preview to render with `<PrivacyLevel>` text, expects NO chips.

- [ ] **Step 3: Commit**

---

### Task D5: `/verify` route — proof checker

**Files:**
- Create: `src/app/verify/page.tsx`
- Create: `src/components/features/verify/verify-form.tsx` (client)

- [ ] **Step 1: Build the verify form**

Single textarea + Verify button + result block. Accepts JSON attestation, attestation ID, or permalink. Routes ID/permalink → `getAttestation` and runs `verifyAttestation`.

Valid → green text + four `✓` check labels listed. Invalid → red text + the failed check explained.

The "What this checks" block below renders the four-line explainer per spec §3.4.

- [ ] **Step 2: E2E**

Paste a fixture attestation JSON → expect "Valid" + four checks. Paste corrupted JSON → expect "Invalid" + failed check name.

- [ ] **Step 3: Commit**

---

### Task D6: `/search` route — global search (basic)

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/lib/api/search.ts` (Server Action or route handler)
- Create: `src/components/features/search/search-results.tsx`

The full Cmd+K palette ships in Phase G (Task G1). This task delivers the standalone results page.

- [ ] **Step 1: Server-side search**

`src/lib/api/search.ts`:
```ts
import { listAttestations } from "@/lib/api/fixtures/attestations";
import { listVaults } from "@/lib/api/fixtures/vaults";
import { getSession } from "@/lib/auth/session";

export type SearchResult =
  | { kind: "vault"; id: string; title: string; subtitle: string; href: string }
  | { kind: "attestation"; id: string; title: string; subtitle: string; href: string; timestamp: Date }
  | { kind: "issuer"; name: string; vaultCount: number; attestationCount: number; href: string };

export async function search(query: string): Promise<SearchResult[]> {
  const session = await getSession();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SearchResult[] = [];
  // Vaults
  const vaults = await listVaults();
  vaults
    .filter((v) => v.name.toLowerCase().includes(q) || v.issuerName.toLowerCase().includes(q))
    .forEach((v) => results.push({ kind: "vault", id: v.id, title: v.name, subtitle: `${v.issuerName} · ${v.assetType}`, href: `/vault/${v.id}` }));
  // Attestations (public + authed role-filtered)
  const atts = await listAttestations({ isPublic: !session || !session.roles.length });
  atts
    .filter((a) => a.analysisType.toLowerCase().includes(q) || a.vaultName.toLowerCase().includes(q) || a.issuerName.toLowerCase().includes(q))
    .forEach((a) => results.push({
      kind: "attestation",
      id: a.id,
      title: `${a.analysisType} · ${a.vaultName}`,
      subtitle: `${a.issuerName} · ${a.curatorName ?? "anonymized"}`,
      href: `/attestation/${a.id}`,
      timestamp: new Date(a.executedAt),
    }));
  return results;
}
```

- [ ] **Step 2: Results page**

`src/app/search/page.tsx`:
- Reads `?q=` from search params
- Calls `search(q)`
- Groups results by `kind`
- Renders each group with an h3 subheading + result rows (per spec §6.3)

Filters (type / time / issuer) added as native selects above results.

- [ ] **Step 3: No-results state**

Renders the §6.5 no-results pattern.

- [ ] **Step 4: E2E + commit**

---

### Phase D checkpoint

- [ ] All five anon-accessible routes render correctly
- [ ] No banned chrome anywhere on the public surface
- [ ] Visual + a11y reviews pass
- [ ] E2E tests cover happy paths for each route

---

## Phase E — Data Ingestion refactor

Existing routes (`/sources/*`, `/vaults/*`, `/audit`) get visually purged of banned chrome and extended with new flows (`/vaults/new`, `/proposals`, dataset versioning).

### Task E1: Refactor `/sources` + `/sources/new` to honor visual language

**Files:**
- Modify: `src/app/sources/page.tsx` and child components
- Modify: `src/components/v2/features/sources/*`

- [ ] **Step 1: Audit the sources surface for banned patterns**

```bash
pnpm lint src/app/sources/ src/components/v2/features/sources/ 2>&1 | grep -E "banned|Eyebrow|Decorative"
```

- [ ] **Step 2: Migrate each surface**

For each file with a violation: replace StatusPill / dot indicators / eyebrow labels / signature pills / done glows with primitives or pure-typographic equivalents.

The step indicator at the top of `add-source-modal/` should use plain-text labels with the current step in heading-weight (no progress pill).

- [ ] **Step 3: Visual review per surface**

Dispatch `ui-design-reviewer` for screenshots of: `/sources`, `/sources/new` (each step of the modal). Verify no banned chrome.

- [ ] **Step 4: Commit per surface**

---

### Task E2: Build `/vaults/new` step flow

**Files:**
- Create: `src/app/vaults/new/page.tsx`
- Create: `src/components/features/vault-create/vault-create-flow.tsx` + sub-components per step

Implement the 6-step flow per spec §4.3. Step indicator uses the same plain-text pattern from E1. Schema review step uses an editable table. Privacy posture step uses `<PrivacyLevel>` selects inline.

Server Action `createVault(input)` creates the vault + first dataset + locks the schema/posture.

- [ ] E2E test: walk through all six steps + verify vault is created.
- [ ] Visual review.
- [ ] Commit.

---

### Task E3: Refactor schema + privacy posture editor

**Files:**
- Modify: `src/app/(originator)/vaults/[id]/data/[datasetId]/page.tsx`
- Modify: child components

- [ ] **Step 1: Replace privacy chips with `<PrivacyLevel>` text in the table**

- [ ] **Step 2: Add the confirmation modal for privacy posture changes**

Modal with the consequence in plain language ("Curators will be able to see individual loan amounts in query results"). Approve → commits change + logs to lineage. Reject → closes modal.

- [ ] **Step 3: Privacy summary line**

Single line of plain text: "1 private · 1 join · 2 aggregate · 1 dimension · 1 queryable". No chart, no pie.

- [ ] **Step 4: Test + commit**

---

### Task E4: Dataset versioning + schema-drift review

**Files:**
- Create: `src/app/(originator)/vaults/[id]/data/[datasetId]/drift-review/page.tsx`
- Create: `src/components/features/dataset-drift/drift-diff.tsx`

- [ ] **Step 1: Detect schema drift**

When a new dataset is ingested, compare its schema to the previous dataset in the same vault. Compute `{ added: Column[], removed: Column[], renamed: { from: string; to: string }[] }`.

- [ ] **Step 2: Drift review UI**

Side-by-side diff. Owner applies privacy posture to added columns. Owner confirms removals. Owner approves rename mappings.

Until reviewed, the new dataset is not queryable.

- [ ] **Step 3: Owner Home + sidebar notification**

If a dataset is pending review, the Owner Home's "Today's signal" line says "N datasets need schema-drift review" with a link.

- [ ] **Step 4: Test + commit**

---

### Task E5: `/proposals` inbox

**Files:**
- Create: `src/app/proposals/page.tsx`
- Create: `src/app/proposals/[id]/page.tsx`
- Create: `src/lib/api/fixtures/proposals.ts`
- Create: `src/components/features/proposals/proposal-row.tsx`
- Create: `src/components/features/proposals/proposal-detail.tsx`

- [ ] **Step 1: Proposal fixtures**

5–10 fixture proposals across 2–3 fixture vaults, mix of pending/approved/rejected.

- [ ] **Step 2: List page**

Per spec §4.6: "Awaiting your decision" section + "Recently decided" section. Rows are typographic; rejected items show reason in parens.

- [ ] **Step 3: Detail page**

Per spec §4.6: Analysis SQL (syntax-highlighted, mono), privacy compliance check (pre-run, shows `✓ valid` or `✗ N violations`), curator identity + history, purpose statement. Approve / Reject buttons. Reject opens a small modal for the reason (free text).

- [ ] **Step 4: Server Actions**

`approveProposal(id)` / `rejectProposal(id, reason)` — mutate fixture state, route the proposal to the executions queue or back to the curator.

- [ ] **Step 5: Test + commit**

---

### Task E6: Audit timeline refactor

**Files:**
- Modify: `src/app/(originator)/vaults/[id]/activity/page.tsx`
- Modify: `src/app/audit/page.tsx`
- Create: `src/components/features/audit/audit-timeline.tsx`

- [ ] **Step 1: Replace icon-based timeline with text-only**

Per spec §4.7: actor as anchor + plain-text action description + `<Timestamp>`. No icons. Day grouping via h3.

- [ ] **Step 2: Test + commit**

---

### Phase E checkpoint

- [ ] `/sources` flow visually clean
- [ ] `/vaults/new` flow ships
- [ ] Schema + privacy editor uses `<PrivacyLevel>` exclusively
- [ ] Dataset versioning + drift review works
- [ ] `/proposals` inbox works
- [ ] Audit timeline uses typographic-only rendering

---

## Phase F — Analysis Lifecycle flow

The biggest new surface: the Analysis builder + the full lifecycle.

### Task F1: Refactor `/cp/vaults` — row layout, typographic

**Files:**
- Modify: `src/app/(counterparty)/cp/vaults/page.tsx`

Migrate from existing card layout to the row layout per spec §5.2. Each row shows issuer · asset name + metadata + active-analyses count + Open / New Analysis CTAs.

Standard task + visual review + commit.

---

### Task F2: Install Monaco editor + privacy validator

**Files:**
- Install: `@monaco-editor/react` (or similar Next.js-friendly Monaco wrapper)
- Create: `src/lib/sql/privacy-validator.ts` + test
- Create: `src/components/features/analysis-builder/sql-editor.tsx`

- [ ] **Step 1: Install Monaco**

```bash
pnpm add @monaco-editor/react
```

- [ ] **Step 2: Implement privacy validator**

`src/lib/sql/privacy-validator.ts`:
```ts
import type { Column } from "@/lib/api/schemas";

export type PrivacyViolation = {
  line: number;
  column: number;
  message: string;
};

export function validateQueryAgainstPosture(
  sql: string,
  schema: Column[]
): PrivacyViolation[] {
  // Parse SQL (basic regex / lightweight parser — MVP), inspect SELECT / WHERE / GROUP BY / JOIN clauses,
  // check each column reference against its privacy level.
  const violations: PrivacyViolation[] = [];
  // ... implementation
  return violations;
}
```

Tests cover each privacy level: private cannot appear anywhere, join only in JOIN, aggregate only in SUM/AVG/COUNT/MIN/MAX, dimension only in GROUP BY/WHERE, select everywhere.

- [ ] **Step 3: SqlEditor wrapper component**

`src/components/features/analysis-builder/sql-editor.tsx`:
```tsx
"use client";

import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import { validateQueryAgainstPosture, type PrivacyViolation } from "@/lib/sql/privacy-validator";
import type { Column } from "@/lib/api/schemas";

export function SqlEditor({
  initial,
  schema,
  onChange,
}: {
  initial: string;
  schema: Column[];
  onChange: (sql: string, violations: PrivacyViolation[]) => void;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const v = validateQueryAgainstPosture(value, schema);
    onChange(value, v);
  }, [value, schema, onChange]);

  return (
    <Editor
      height="400px"
      defaultLanguage="sql"
      value={value}
      onChange={(v) => setValue(v ?? "")}
      options={{
        fontSize: 13,
        fontFamily: "var(--font-geist-mono)",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
      }}
    />
  );
}
```

Monaco's built-in syntax highlighting is sufficient. Subtle theming via Monaco's theme API (constrained palette, weight-driven hierarchy — no garish colors).

- [ ] **Step 4: Test + commit**

---

### Task F3: Analysis builder shell — `/cp/analyses/new`

**Files:**
- Create: `src/app/(counterparty)/cp/analyses/new/page.tsx`
- Create: `src/components/features/analysis-builder/builder-shell.tsx`
- Create: `src/components/features/analysis-builder/schema-sidebar.tsx`
- Create: `src/components/features/analysis-builder/templates-list.tsx`

Per spec §5.3 — 2-column layout.

- [ ] **Step 1: Shell layout**

`<BuilderShell>` — split into left sidebar (~280px) + center main + output tabs panel below.

- [ ] **Step 2: Schema sidebar with tabs**

`<SchemaSidebar>`:
- Top: Analysis name + back arrow
- Tabs: Schema · Templates
- Search input
- Tree of vault → columns, each with `<PrivacyLevel level={...} abbreviated />`
- Click column → calls callback to insert into editor

- [ ] **Step 3: Templates list**

`<TemplatesList>`:
- Flat list of Hyve-provided templates (NAV / Concentration / Reserves / Default rate / Custom)
- Each: name + one-line description
- Click → loads the template SQL into the editor

- [ ] **Step 4: Wire shell + sidebar + editor**

Shell state: current SQL, current Analysis name, current purpose, selected vault, selected template, privacy violations.

- [ ] **Step 5: Commit**

---

### Task F4: Top bar + privacy check status + lifecycle actions

**Files:**
- Create: `src/components/features/analysis-builder/builder-top-bar.tsx`
- Create: `src/components/features/analysis-builder/privacy-check-status.tsx`

- [ ] **Step 1: Top bar**

Analysis name (inline-editable input), Save and Run buttons top right. Save state shown as "Saved 2m ago" muted text next to the title when applicable.

- [ ] **Step 2: Privacy check status line**

Under the top bar:
- 0 violations → `<Status tone="success">✓ Privacy check passed</Status>`
- N violations → `<Status tone="danger">✗ N violations</Status>` (click expands the list inline with line numbers)

- [ ] **Step 3: Action button per state**

Map of lifecycle state → button label + handler:
- author: `Save` + `Propose` (disabled if violations > 0 or purpose empty)
- proposed: `Cancel proposal`
- approved: `Run`
- executing: (no button, status text)
- signed: (no button — delivery happens via output tabs)

- [ ] **Step 4: Test + commit**

---

### Task F5: Output tabs — Results · Visualize · Oracle · Webhook · API

**Files:**
- Create: `src/components/features/analysis-builder/output-tabs.tsx`
- Create: `src/components/features/analysis-builder/output-results.tsx`
- Create: `src/components/features/analysis-builder/output-visualize.tsx`
- Create: `src/components/features/analysis-builder/output-oracle.tsx`
- Create: `src/components/features/analysis-builder/output-webhook.tsx`
- Create: `src/components/features/analysis-builder/output-api.tsx`

Per spec §5.3.

- [ ] **Step 1: Tab strip**

Plain text labels. Active = heading-weight + 1px accent bottom-border. Inactive = muted normal weight. No fills, no pills, no icons.

- [ ] **Step 2: Results tab**

Sortable data table. Mono font for numerics. Below: `Data signed [Timestamp] · attestation [hash mono] · [public/private toggle]`.

- [ ] **Step 3: Visualize tab**

Chart-type picker (bar / line / KPI / table) — 3–4 chart types in MVP. Use a lightweight chart library (Recharts already common; check package.json).

For the MVP, the picker shows 4 options as plain-text buttons; the chosen chart renders below. Empty state: "Pick a chart type to visualize results."

- [ ] **Step 4: Oracle tab**

Form: chain (select: Ethereum / Base / Arbitrum / Solana), contract address, oracle network (Pyth / Chainlink / RedStone / Custom). Payload format preview (JSON). `Publish onchain` button. History list of past deliveries (status + tx hash + Timestamp).

- [ ] **Step 5: Webhook tab**

Form: URL, auth header (key + value), payload preview. Test webhook button. Delivery history (status + latency + Timestamp).

- [ ] **Step 6: API tab**

Read-only display: endpoint URL for this Analysis's latest signed result, API key reference (masked, copy-to-clipboard), `curl` example.

- [ ] **Step 7: Empty states for each tab**

Pre-Run state of each tab = an empty state explaining what it'll do. Plain text + verb CTA.

- [ ] **Step 8: Commit per tab**

---

### Task F6: Lifecycle state machine + proposal Server Actions

**Files:**
- Create: `src/lib/api/analysis-actions.ts` (Server Actions)
- Create: `src/lib/api/fixtures/analyses.ts`

- [ ] **Step 1: Analysis fixture**

`src/lib/api/fixtures/analyses.ts` — fixture Analyses across states (draft, proposed, approved, executing, completed, signed).

- [ ] **Step 2: Server Actions**

```ts
"use server";

export async function saveDraft(input: { id?: string; sql: string; purpose: string; vaultId: string; name: string }): Promise<{ id: string }> { /* ... */ }
export async function proposeAnalysis(id: string): Promise<void> { /* moves to 'proposed', notifies owner */ }
export async function cancelProposal(id: string): Promise<void> { /* back to 'draft' */ }
export async function executeApproved(id: string): Promise<void> { /* simulate enclave execution */ }
export async function signResult(id: string): Promise<{ attestationHash: string }> { /* ... */ }
export async function togglePublicationConsent(id: string, consent: boolean): Promise<void> { /* ... */ }
```

- [ ] **Step 3: Wire into the builder shell**

Button actions in F4 → call these Server Actions. State updates via `revalidatePath`.

- [ ] **Step 4: Test + commit**

---

### Task F7: Dual-consent publication

**Files:**
- Modify: `src/app/(originator)/vaults/[id]/attestations/page.tsx` (or wherever the attestations tab lives) — add owner "Make public" toggle per attestation
- Modify: Results tab in the builder — add curator "Publish to feed" toggle
- Modify: `src/lib/api/analysis-actions.ts` — implement publication logic

- [ ] **Step 1: Toggle UI on both surfaces**

Plain-text toggle: "Public" / "Private" with a switch (shadcn `<Switch>`). Below: muted text explaining state ("Awaiting curator consent" / "Awaiting owner consent" / "Public" / "Private").

- [ ] **Step 2: Confirmation modal on toggle**

Per spec §5.5 — modal stating consequence in plain language. Confirm or cancel.

- [ ] **Step 3: Effective public visibility**

`isPublic = ownerConsent && curatorConsent`. The `/explore` feed filter respects this.

- [ ] **Step 4: Test + commit**

---

### Task F8: `/cp/executions` + `/cp/analyses`

**Files:**
- Modify: `src/app/(counterparty)/cp/executions/page.tsx`
- Modify: `src/app/(counterparty)/cp/analyses/page.tsx`

- [ ] **Step 1: Executions list**

Row format per spec §5.6. Public / private / running as colored verb text.

- [ ] **Step 2: My Analyses list**

Grouped by state: Drafts / Awaiting decision / Approved & ready to execute. Per spec §5.7.

- [ ] **Step 3: Refactor existing pages to drop banned chrome**

Run ESLint on these pages; migrate anything flagged.

- [ ] **Step 4: Commit**

---

### Phase F checkpoint

- [ ] Analysis builder ships end-to-end (write SQL → propose → owner approves → execute → sign → publish)
- [ ] Output tabs (5 of them) all render
- [ ] Dual-consent publication works
- [ ] Executions + My Analyses lists clean
- [ ] Privacy validation catches violations inline
- [ ] Visual + a11y reviews pass

---

## Phase G — Search & Discovery

The `/search` page shipped in D6. This phase adds the Cmd+K palette and polishes search ranking.

### Task G1: Cmd+K palette

**Files:**
- Create: `src/components/features/search/command-palette.tsx`
- Create: `src/components/features/search/use-command-palette.ts` (Context provider)
- Modify: `src/components/v2/shell/v2-shell.tsx` — mount the palette + register the keyboard shortcut

- [ ] **Step 1: Implement using shadcn `<Command>` (already installed)**

```tsx
"use client";

import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchAction } from "@/lib/api/search-action";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<...>([]);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search Hyve..." onValueChange={(q) => searchAction(q).then(setResults)} />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        {/* Groups per spec §6.2 */}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 2: Mount in shell**

Add `<CommandPalette />` to the V2Shell so it's available everywhere.

- [ ] **Step 3: E2E**

Press Cmd+K → palette opens. Type a query → results group by type. Press Enter on a result → navigates. Press Enter on the input → routes to `/search?q=...`.

- [ ] **Step 4: A11y review**

Dispatch `accessibility-auditor` — verify focus trap, escape closes, screen-reader announces the dialog.

- [ ] **Step 5: Commit**

---

### Phase G checkpoint

- [ ] Cmd+K palette opens globally with keyboard shortcut
- [ ] Results group by type
- [ ] A11y review passes

---

## Phase H — Cross-cutting polish + final audit

### Task H1: Loading states across the platform

**Files:**
- Audit all routes; replace spinners with skeletons

- [ ] **Step 1: Grep for spinners**

```bash
grep -rn "animate-spin\|<Spinner\|<Loader" src/
```

- [ ] **Step 2: Replace each with a skeleton**

Use the existing shadcn `<Skeleton>` component. Build 3–5 static skeleton rows for list surfaces. Match final layout for detail pages.

- [ ] **Step 3: Visual review**

Capture screenshots of loading states for: `/explore` (initial load), `/proposals` (initial load), Analysis builder during Run, search results during typing.

- [ ] **Step 4: Commit**

---

### Task H2: Empty states across the platform

**Files:**
- Audit all routes for empty states

- [ ] **Step 1: List surfaces that can be empty**

`/vaults` (no vaults), `/proposals` (no proposals), `/cp/analyses` (no analyses), `/cp/executions` (no executions), `/sources` (no sources), `/explore` (no public attestations — should never happen in MVP but build the state anyway), `/search` (no query / no results).

- [ ] **Step 2: Apply the §7.3 pattern uniformly**

Heading + one sentence + verb CTA. No illustrations.

- [ ] **Step 3: Commit**

---

### Task H3: Error boundaries + error states

**Files:**
- Create: `src/app/error.tsx` (App Router error boundary)
- Create: `src/app/not-found.tsx`
- Audit forms for inline error states

- [ ] **Step 1: Global error boundary**

`src/app/error.tsx`: catches uncaught exceptions, renders catastrophic message per spec §7.4.

- [ ] **Step 2: not-found page**

`src/app/not-found.tsx`: plain-text 404 with link back to `/explore`.

- [ ] **Step 3: Form validation errors**

Audit each form (login, onboarding, vault create, proposal reject reason, source connect): ensure validation errors render red text under the field, not as banners.

- [ ] **Step 4: Network error retry pattern**

Each SWR-fetched surface: `Couldn't load X. [Retry]`. Implement using SWR's `error` + `mutate`.

- [ ] **Step 5: Commit**

---

### Task H4: Toast usage audit

**Files:**
- Audit all `toast(...)` calls

- [ ] **Step 1: Find every toast call**

```bash
grep -rn "toast(" src/
```

- [ ] **Step 2: Classify each**

Allowed: async confirmations not already shown inline. Banned: error toasts that should be inline; welcomes; tips; "saved" confirmations when the page already shows saved state.

- [ ] **Step 3: Remove banned toasts; replace with inline state**

- [ ] **Step 4: Commit**

---

### Task H5: Motion budget enforcement

**Files:**
- Audit all transition / animation utilities

- [ ] **Step 1: Find every animation**

```bash
grep -rn "animate-\|transition-\|@keyframes\|transform:" src/
```

- [ ] **Step 2: Verify each motion is allowed**

Allowed: opacity fades ≤200ms, hover transitions ≤150ms, collapse/expand ≤200ms, tab switches ≤100ms. Banned: anything else.

- [ ] **Step 3: Add `prefers-reduced-motion: reduce` overrides**

In `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Commit**

---

### Task H6: Density tokens

**Files:**
- Modify: `src/app/globals.css`
- Audit: spacing usages across `src/components/`

- [ ] **Step 1: Add spacing scale tokens**

Already standard in Tailwind (`p-1` = 4px). Confirm Tailwind's default scale matches the spec §7.6 table. If not, override in `tailwind.config`.

- [ ] **Step 2: Apply consistent font sizes**

Base sans: 14px (Tailwind `text-sm` if base is 14, otherwise add a utility). Table: 13px. Mono: 13px.

- [ ] **Step 3: Commit**

---

### Task H7: Responsive breakpoints

**Files:**
- Audit: each surface at 1280px, 768–1279px, <768px

- [ ] **Step 1: Test desktop ≥1280px**

Each surface should look as designed.

- [ ] **Step 2: Test tablet 768–1279px**

Analysis builder sidebar collapses to a drawer (controlled via state, opens on click of a "Schema" button). Padding reduced ~25%.

- [ ] **Step 3: Test mobile <768px**

Public surfaces work fully responsively. Auth'd power tools render a "Best on desktop" message with critical read-only actions still functional.

- [ ] **Step 4: E2E tests at each breakpoint**

Playwright supports viewport overrides. Run smoke tests at each.

- [ ] **Step 5: Commit**

---

### Task H8: Accessibility full audit

**Files:**
- Dispatch `accessibility-auditor` on every authenticated and anon surface

- [ ] **Step 1: Skip-to-content link in shell**

Add as the first focusable element in `<V2Shell>`. Visible on focus only.

- [ ] **Step 2: ARIA labels on icon-only controls**

Audit: sidebar collapse toggle, modal close buttons, hover-revealed action buttons. Each must have `aria-label`.

- [ ] **Step 3: Form labels**

No placeholder-as-label. Every input has a `<label>` or `aria-label`.

- [ ] **Step 4: Keyboard navigation**

Tab through every surface. Focus order matches visual order. All interactive elements reachable.

- [ ] **Step 5: Color-contrast check**

Run automated contrast check (axe-core or similar) on each route. WCAG AA threshold (4.5:1 body text, 3:1 large text).

- [ ] **Step 6: Run accessibility-auditor agent on each major route**

`/`, `/cp`, `/explore`, `/attestation/[id]`, `/vault/[id]`, `/verify`, `/search`, `/vaults`, `/sources`, `/proposals`, `/cp/analyses/new`, `/cp/executions`. Capture audit reports.

- [ ] **Step 7: Fix any issues found**

- [ ] **Step 8: Commit**

---

### Task H9: Final visual review tour

- [ ] Dispatch `ui-design-reviewer` to take a Playwright screenshot of every major surface and confirm visual-language compliance.

- [ ] Verify: no decorative dots anywhere, no eyebrow labels, no status pills, no privacy chips, no glows / pulses, no slide-in animations on lists, color paired with text on every signal.

- [ ] Final commit on this plan.

---

## Self-Review (executed by plan author)

**Spec coverage:**

| Spec section | Phase / Task |
|---|---|
| §1 (design system foundation) | Phase A |
| §2 (unified shell + identity) | Phase B |
| §2.7 (Home pages) | Phase C |
| §3 (public verification) | Phase D |
| §4 (data ingestion) | Phase E |
| §5 (Analysis lifecycle) | Phase F |
| §6 (search) | Phase G (D6 + G1) |
| §7 (cross-cutting) | Phase H |
| §8 (agent + skill updates) | NOT in scope here (covered by `2026-05-26-governance-foundation.md`) |
| §Sequencing step 7 (color calibration) | A1 |
| §Sequencing step 8 (primitives) | A3, A4, A5, A6 |
| §Sequencing step 9 (migration) | A7, A8, A9 |
| §Sequencing step 10 (feature work) | Phases C–G |

**Placeholder scan:** No "TBD" / "TODO" / "implement later" in step bodies. Some Phase E and F task steps describe what to do without showing the full code — that's intentional for tasks that span multiple files (the implementing agent reads the spec section, dispatches the right specialist, and uses the visual-language rules + primitives established in Phase A). The structure remains testable because every task has a verification step and a commit.

**Type consistency:** Primitive names match between Phase A introduction and Phase C–G usage (`<Status>`, `<Timestamp>`, `<PrivacyLevel>`, `<Section>`, `<Disabled>`, `<ResourceCard>`).

**Scope check:** This plan is at the upper bound of what should be in one document. Phases A and B are foundational (block everything else). Phases C–G are independent feature flows that can ship in parallel after A + B. Phase H is final cross-cutting polish. If the executing orchestrator runs into context limits, it can split execution at any phase boundary.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-26-hyve-platform-build.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task via `superpowers:subagent-driven-development`. Each task is reviewed before the next starts. The orchestrator session never writes code directly — it routes per the `hyve-driven-development` routing table. Phase boundaries are natural checkpoints. Phases C–G can run in parallel (multiple worktrees) after A + B ship.

2. **Inline Execution** — Tasks execute in this session using `superpowers:executing-plans`. Faster but no two-stage review. Probably too large for one session — context will fill before completion.

Which approach?
