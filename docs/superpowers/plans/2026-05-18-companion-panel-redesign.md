# Companion Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline bottom-panel JSX block in `components/v2/features/cp/analysis-workbench.tsx` (lines ~2044–2742) with a resizable VS Code-style companion panel that has six purpose-built tabs — including a new Terminal tab supporting Bridge / Assistant / CLI modes.

**Architecture:** A `CompanionPanel` shell hosts six lazy-mounted tab subtrees and consumes a `CompanionContext` provider so tabs read state directly instead of receiving 13 props. A `usePanelResize` hook drives a top-edge drag handle and persists height to `sessionStorage`. Tab redesigns are purpose-built — no shared template. Terminal Bridge mode is a UI mock; Assistant mode is real, using Vercel AI Gateway with a BYO key stored in `localStorage`; CLI mode is a real frontend REPL with mocked outputs that match existing fixtures.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4 + `--v2-*` tokens, shadcn/ui patterns, AI SDK v6, Shiki (lazy), react-markdown (lazy), Vitest + RTL, Playwright MCP.

**Reference spec:** `docs/superpowers/specs/2026-05-18-companion-panel-redesign-design.md`

---

## File map

**Create:**
- `components/v2/features/cp/companion/companion-panel.types.ts` — shared types
- `components/v2/features/cp/companion/companion-context.tsx` — provider + hook
- `components/v2/features/cp/companion/use-panel-resize.ts` — resize hook
- `components/v2/features/cp/companion/companion-panel.tsx` — shell (resize, tab strip, lazy mount)
- `components/v2/features/cp/companion/validate-tab.tsx`
- `components/v2/features/cp/companion/dryrun-tab.tsx`
- `components/v2/features/cp/companion/tests-tab.tsx`
- `components/v2/features/cp/companion/schedule-tab.tsx`
- `components/v2/features/cp/companion/integration-tab.tsx`
- `components/v2/features/cp/companion/integration-codegen.ts` — language codegen
- `components/v2/features/cp/companion/copy-button.tsx` — extracted from workbench
- `components/v2/features/cp/companion/terminal/terminal-tab.tsx`
- `components/v2/features/cp/companion/terminal/bridge-mode.tsx`
- `components/v2/features/cp/companion/terminal/assistant-mode.tsx`
- `components/v2/features/cp/companion/terminal/cli-mode.tsx`
- `components/v2/features/cp/companion/terminal/cli-commands.ts` — parser + handlers
- `tests/unit/components/companion/use-panel-resize.test.ts`
- `tests/unit/components/companion/companion-context.test.tsx`
- `tests/unit/components/companion/integration-codegen.test.ts`
- `tests/unit/components/companion/cli-commands.test.ts`
- `tests/unit/components/companion/validate-tab.test.tsx`
- `tests/unit/components/companion/tests-tab.test.tsx`
- `tests/e2e/companion-panel.spec.ts`

**Modify:**
- `components/v2/features/cp/analysis-workbench.tsx` — remove inline panel (lines ~2044–2742), replace with `<CompanionPanelProvider><CompanionPanel /></CompanionPanelProvider>`
- `package.json` — add `ai`, `shiki`, `react-markdown`, `remark-gfm`

---

## Task 1: Extract types and existing bottom panel as-is (refactor, no behavior change)

**Why first:** This is a safe lift. It moves ~700 lines out of `analysis-workbench.tsx` so the rest of the plan can edit small, focused files. The shape of the existing five tabs is preserved exactly.

**Files:**
- Create: `components/v2/features/cp/companion/companion-panel.types.ts`
- Create: `components/v2/features/cp/companion/copy-button.tsx`
- Create: `components/v2/features/cp/companion/companion-panel.tsx`
- Modify: `components/v2/features/cp/analysis-workbench.tsx`

- [ ] **Step 1: Create the shared types file**

Create `components/v2/features/cp/companion/companion-panel.types.ts`:

```ts
import type { ConsumerVault, Destination, FieldRef, TriggerKind, OnchainDest } from '@/components/v2/features/cp/cp-fixtures'

export type CompanionTab =
  | 'validate'
  | 'dryrun'
  | 'tests'
  | 'schedule'
  | 'integration'
  | 'terminal'

export type TerminalMode = 'bridge' | 'assistant' | 'cli'

export type CompanionPanelProps = {
  open: boolean
  onToggle: () => void
  activeTab: CompanionTab
  onTabChange: (t: CompanionTab) => void
}

export type CompanionContextValue = {
  code: string
  vault: ConsumerVault | null
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
  triggerKind: TriggerKind
  cronExpr: string
  eventSource: string
  onchainDests: OnchainDest[]
}
```

Adjust imports to whatever the actual export names are in `cp-fixtures.ts` — verify them with `grep -n "^export" components/v2/features/cp/cp-fixtures.ts` before completing this step.

- [ ] **Step 2: Extract `CopyButton`**

Create `components/v2/features/cp/companion/copy-button.tsx` with the exact contents of the `CopyButton` component currently inline in `analysis-workbench.tsx` around lines 2073–2099. Export it named.

- [ ] **Step 3: Move the bottom panel JSX into `companion-panel.tsx`**

Create `components/v2/features/cp/companion/companion-panel.tsx`. Move:
- The `CompanionPanel` function (currently ~line 2113 in `analysis-workbench.tsx`)
- The `PolicyIcon` helper (line ~2062)
- The `SAMPLE_ROWS` fixture (line ~2103) — but only if it is not used elsewhere; if it is, leave it in place and import.
- The `isNumericValue` helper (line ~2109)

Imports need updating. The component should remain client-side (`'use client'`). Props stay identical to the existing `CompanionPanelProps` so `analysis-workbench.tsx` doesn't change its call site yet.

- [ ] **Step 4: Update `analysis-workbench.tsx` to import the panel**

In `analysis-workbench.tsx`:
- Add `import { CompanionPanel } from './companion/companion-panel'` and `import type { CompanionTab } from './companion/companion-panel.types'` near the top.
- Remove the inline `CompanionPanel` function, `CompanionPanelProps`, `PolicyIcon`, `CopyButton`, `isNumericValue`, and (if moved) `SAMPLE_ROWS` declarations.
- Remove the inline `type CompanionTab = ...` declaration (line ~1290) — it now lives in the types file.
- Confirm the JSX call site for `<CompanionPanel ... />` is unchanged.

- [ ] **Step 5: Type-check**

Run: `pnpm typecheck`
Expected: PASS with no new errors.

- [ ] **Step 6: Visual smoke check**

Run: `pnpm dev` and navigate to `http://localhost:3000/cp/analyses/new?vault=acred`. Open the bottom panel, click each tab. Behavior must be identical to before.

Take screenshots via Playwright MCP at `verify-task-1-validate.png`, `verify-task-1-dryrun.png`, `verify-task-1-tests.png`, `verify-task-1-schedule.png`, `verify-task-1-integration.png`. Compare to the existing `verify-tabs-v2-*.png` files in the repo root for regression.

- [ ] **Step 7: Commit**

```bash
git add components/v2/features/cp/companion/ components/v2/features/cp/analysis-workbench.tsx
git commit -m "refactor(cp): extract companion bottom panel into its own subtree

No behavior change. Lifts the inline panel JSX out of the 3148-line
analysis-workbench.tsx into components/v2/features/cp/companion/ so
the upcoming redesign can edit focused files.

- companion-panel.types.ts: shared CompanionTab / TerminalMode / props
- companion-panel.tsx: the existing panel verbatim
- copy-button.tsx: extracted from the workbench

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: CompanionContext provider — eliminate the prop drill

**Why:** The current panel takes 9 props from `analysis-workbench.tsx`. Adding a Terminal tab with its own state plus per-tab UI state (popovers, assertion edits, terminal scrollback) would push that toward 20. Context decouples the panel tree from the workbench's prop surface.

**Files:**
- Create: `components/v2/features/cp/companion/companion-context.tsx`
- Create: `tests/unit/components/companion/companion-context.test.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`
- Modify: `components/v2/features/cp/analysis-workbench.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/companion/companion-context.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { CompanionContextProvider, useCompanionContext } from '@/components/v2/features/cp/companion/companion-context'

const baseValue = {
  code: 'SELECT 1',
  vault: null,
  fieldRefs: [],
  destinations: [],
  name: 'test',
  triggerKind: 'manual' as const,
  cronExpr: '',
  eventSource: '',
  onchainDests: [],
}

describe('CompanionContext', () => {
  it('exposes value to consumers', () => {
    const { result } = renderHook(() => useCompanionContext(), {
      wrapper: ({ children }) => (
        <CompanionContextProvider value={baseValue}>{children}</CompanionContextProvider>
      ),
    })
    expect(result.current.code).toBe('SELECT 1')
    expect(result.current.name).toBe('test')
  })

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useCompanionContext())).toThrow(
      /useCompanionContext must be used inside CompanionContextProvider/,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/components/companion/companion-context.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the provider**

Create `components/v2/features/cp/companion/companion-context.tsx`:

```tsx
'use client'
import { createContext, useContext, type ReactNode } from 'react'
import type { CompanionContextValue } from './companion-panel.types'

const CompanionContext = createContext<CompanionContextValue | null>(null)

export function CompanionContextProvider({
  value,
  children,
}: {
  value: CompanionContextValue
  children: ReactNode
}) {
  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>
}

export function useCompanionContext(): CompanionContextValue {
  const ctx = useContext(CompanionContext)
  if (!ctx) {
    throw new Error('useCompanionContext must be used inside CompanionContextProvider')
  }
  return ctx
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/components/companion/companion-context.test.tsx`
Expected: 2 PASS.

- [ ] **Step 5: Refactor `companion-panel.tsx` to read from context**

In `companion-panel.tsx`:
- Remove all props except `open`, `onToggle`, `activeTab`, `onTabChange`.
- At the top of the function body, replace `const { code, vault, fieldRefs, destinations, name, triggerKind, cronExpr, eventSource } = props` with `const { code, vault, fieldRefs, destinations, name, triggerKind, cronExpr, eventSource, onchainDests } = useCompanionContext()`.
- Remove the local `onchainDests` derivation since it now comes from context.
- Update `CompanionPanelProps` import to point at the new prop-only type.

- [ ] **Step 6: Wrap the panel call site with the provider in `analysis-workbench.tsx`**

Find the JSX site for `<CompanionPanel ... />`. Replace its prop drill with:

```tsx
<CompanionContextProvider
  value={{
    code,
    vault,
    fieldRefs,
    destinations,
    name,
    triggerKind,
    cronExpr,
    eventSource,
    onchainDests: destinations.filter((d): d is OnchainDest => d.kind === 'onchain'),
  }}
>
  <CompanionPanel
    open={companionOpen}
    onToggle={() => setCompanionOpen((v) => !v)}
    activeTab={activeTab}
    onTabChange={setActiveTab}
  />
</CompanionContextProvider>
```

(Variable names are illustrative — match whatever `analysis-workbench.tsx` already uses.)

- [ ] **Step 7: Type-check + visual smoke**

```bash
pnpm typecheck
pnpm dev   # then click each of the 5 existing tabs
```

- [ ] **Step 8: Commit**

```bash
git add components/v2/features/cp/companion/ components/v2/features/cp/analysis-workbench.tsx tests/unit/components/companion/
git commit -m "refactor(cp): introduce CompanionContext to eliminate panel prop drill

CompanionPanel now takes only open/onToggle/activeTab/onTabChange.
Everything else (code, vault, destinations, trigger, cron, ...) flows
through context. Unblocks Terminal tab adding its own state without
threading 5 more props through the workbench.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: `usePanelResize` hook + drag handle + Terminal tab in strip

**Why:** Adds the VS Code-style resize gesture and registers the sixth tab. After this task the shell behaves correctly even though the Terminal tab renders a placeholder.

**Files:**
- Create: `components/v2/features/cp/companion/use-panel-resize.ts`
- Create: `tests/unit/components/companion/use-panel-resize.test.ts`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.types.ts` (already added `'terminal'` in Task 1)

- [ ] **Step 1: Write the failing test for the resize hook**

Create `tests/unit/components/companion/use-panel-resize.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelResize } from '@/components/v2/features/cp/companion/use-panel-resize'

describe('usePanelResize', () => {
  beforeEach(() => {
    sessionStorage.clear()
    // jsdom defaults innerHeight to 768; assert it for confidence
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
  })

  it('returns the initial height when no storage value exists', () => {
    const { result } = renderHook(() => usePanelResize({ initial: 320, min: 40, maxRatio: 0.75 }))
    expect(result.current.height).toBe(320)
  })

  it('clamps height to [min, viewportHeight * maxRatio]', () => {
    const { result } = renderHook(() => usePanelResize({ initial: 320, min: 40, maxRatio: 0.75 }))
    act(() => result.current.setHeight(20))
    expect(result.current.height).toBe(40)
    act(() => result.current.setHeight(9999))
    expect(result.current.height).toBe(600) // 800 * 0.75
  })

  it('persists height to sessionStorage', () => {
    const { result } = renderHook(() =>
      usePanelResize({ initial: 320, min: 40, maxRatio: 0.75, storageKey: 'k' }),
    )
    act(() => result.current.setHeight(500))
    expect(sessionStorage.getItem('k')).toBe('500')
  })

  it('reads persisted height on init', () => {
    sessionStorage.setItem('k', '420')
    const { result } = renderHook(() =>
      usePanelResize({ initial: 320, min: 40, maxRatio: 0.75, storageKey: 'k' }),
    )
    expect(result.current.height).toBe(420)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run tests/unit/components/companion/use-panel-resize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `components/v2/features/cp/companion/use-panel-resize.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export type UsePanelResizeOpts = {
  initial: number
  min: number
  maxRatio: number // 0..1 of window.innerHeight
  storageKey?: string
}

export type UsePanelResizeResult = {
  height: number
  setHeight: (h: number) => void
  startDrag: (e: React.PointerEvent<HTMLElement>) => void
  isDragging: boolean
}

function clamp(h: number, min: number, max: number): number {
  if (h < min) return min
  if (h > max) return max
  return h
}

export function usePanelResize({
  initial,
  min,
  maxRatio,
  storageKey,
}: UsePanelResizeOpts): UsePanelResizeResult {
  const [height, setHeightRaw] = useState<number>(() => {
    if (typeof window === 'undefined' || !storageKey) return initial
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!Number.isNaN(n)) return n
    }
    return initial
  })

  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number | null>(null)

  const setHeight = useCallback(
    (h: number) => {
      if (typeof window === 'undefined') return
      const max = window.innerHeight * maxRatio
      const next = clamp(h, min, max)
      setHeightRaw(next)
      if (storageKey) sessionStorage.setItem(storageKey, String(next))
    },
    [min, maxRatio, storageKey],
  )

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      setIsDragging(true)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          setHeight(window.innerHeight - ev.clientY)
        })
      }
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId)
        setIsDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [setHeight],
  )

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { height, setHeight, startDrag, isDragging }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm vitest run tests/unit/components/companion/use-panel-resize.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Add the drag handle and Terminal tab trigger in the shell**

In `companion-panel.tsx`:

1. At the top of the component body, call the hook:

```ts
const { height, setHeight, startDrag } = usePanelResize({
  initial: 320,
  min: 40,
  maxRatio: 0.75,
  storageKey: 'analysis-workbench:panel-height',
})
```

2. Replace the outer container's height logic:

```tsx
<div
  className={cn(
    'flex flex-col border-t border-v2-border bg-v2-foreground/[0.03]',
    open ? '' : 'h-9',
  )}
  style={open ? { height } : undefined}
>
  {/* Drag handle — only visible/active when open */}
  {open && (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-valuemin={40}
      aria-valuemax={Math.round(window.innerHeight * 0.75)}
      aria-valuenow={height}
      aria-label="Resize companion panel"
      tabIndex={0}
      onPointerDown={startDrag}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); setHeight(height + 24) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setHeight(height - 24) }
        else if (e.key === 'PageUp') { e.preventDefault(); setHeight(height + 100) }
        else if (e.key === 'PageDown') { e.preventDefault(); setHeight(height - 100) }
        else if (e.key === 'Home') { e.preventDefault(); setHeight(40) }
        else if (e.key === 'End') { e.preventDefault(); setHeight(99999) }
      }}
      className="h-1.5 cursor-row-resize touch-none select-none border-b border-v2-border/40 transition-colors hover:bg-v2-foreground/[0.08] focus-visible:bg-v2-accent/30 focus-visible:outline-none"
    />
  )}
  {/* ...existing tabs + content... */}
</div>
```

3. Add the Terminal entry in the tab-trigger map (it is already in the `CompanionTab` type from Task 1):

```ts
{ value: 'terminal', label: 'Terminal', badge: 0 },
```

4. Add a placeholder `<TabsContent value="terminal" />` body so switching to it doesn't render nothing:

```tsx
<TabsContent value="terminal" className="m-0 h-full">
  <div className="px-4 py-3">
    <p className="font-mono text-[11px] text-v2-muted">Terminal coming online…</p>
  </div>
</TabsContent>
```

- [ ] **Step 6: Type-check + visual verify**

```bash
pnpm typecheck
pnpm dev
```

In the browser: open the panel, drag the top edge up and down, refresh — height persists. Tab to the handle and press ArrowUp/ArrowDown — height changes. Click the new Terminal tab — placeholder appears.

Screenshot via Playwright MCP: `verify-task-3-resized.png`, `verify-task-3-terminal-tab.png`.

- [ ] **Step 7: Commit**

```bash
git add components/v2/features/cp/companion/ tests/unit/components/companion/use-panel-resize.test.ts
git commit -m "feat(cp): resizable companion panel + Terminal tab entry

usePanelResize drives a top-edge drag handle with keyboard a11y
(arrows, PageUp/Dn, Home/End). Height persists per session in
sessionStorage. Adds the Terminal tab to the strip with a placeholder
body — implementation lands in later tasks.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Validate tab — flat sorted problem-list

**Files:**
- Create: `components/v2/features/cp/companion/validate-tab.tsx`
- Create: `tests/unit/components/companion/validate-tab.test.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx` — render `<ValidateTab />` instead of inline JSX

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/companion/validate-tab.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ValidateTab } from '@/components/v2/features/cp/companion/validate-tab'
import { CompanionContextProvider } from '@/components/v2/features/cp/companion/companion-context'

const minimalCtx = {
  code: '',
  vault: null,
  fieldRefs: [],
  destinations: [],
  name: '',
  triggerKind: 'manual' as const,
  cronExpr: '',
  eventSource: '',
  onchainDests: [],
}

describe('ValidateTab', () => {
  it('renders the aggregate status pill with count', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab />
      </CompanionContextProvider>,
    )
    // With empty code, at least one check should be failing.
    const pill = screen.getByTestId('validate-status-pill')
    expect(pill).toBeInTheDocument()
    expect(pill.textContent).toMatch(/issue/i)
  })

  it('sorts failed rows before passed rows', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab />
      </CompanionContextProvider>,
    )
    const rows = screen.getAllByRole('listitem')
    // First row must be a failure or warning.
    const firstSeverity = within(rows[0]).getByTestId('row-severity').getAttribute('data-severity')
    expect(firstSeverity === 'fail' || firstSeverity === 'warn').toBe(true)
  })

  it('disables Submit when any check is failing', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab />
      </CompanionContextProvider>,
    )
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run tests/unit/components/companion/validate-tab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ValidateTab`**

Create `components/v2/features/cp/companion/validate-tab.tsx`. The component:

1. Reads `code`, `vault`, `fieldRefs`, `destinations`, `name` from `useCompanionContext()`.
2. Builds the same `codeChecks` and `policyChecks` arrays the inline panel currently builds (re-export `buildCodeChecks` and `buildPolicyChecksWithKMin` from `analysis-workbench.tsx` if they aren't already exported — extract them into a `companion/validate-checks.ts` helper if so).
3. Concatenates both lists into a single `Check[]` array, sorts by severity (`fail` < `warn` < `pass`), then by original index.
4. Renders:
   - Header row: a status pill (`data-testid="validate-status-pill"`) showing "Ready to submit" / "N issues" + Submit button (`disabled` when any fail).
   - A `<ul role="list">` of rows. Each row is a `<li role="listitem">` containing severity icon (`<span data-testid="row-severity" data-severity={status}>`), label, detail, and an optional inline action button.
5. Inline action map — based on the check id, return an `{ label, onClick }`:
   - `tests-missing` → `{ label: 'Add test →', onClick: () => onTabChange('tests') }` (need to pass `onTabChange` via context or a callback prop — add it to `CompanionContextValue` if it isn't already; this is the only consumer).
   - `policy-redact-*` → `{ label: 'Open policy →', onClick: scrolls to relevant editor section }` (mock: log to console).
   - `code-from-missing` → `{ label: 'Jump to FROM →', onClick: focus editor line 1 }`.
6. Typography: status pill uses `font-mono text-[11px]`; row label `text-[11px]`; row detail `text-[10.5px] text-v2-muted`. The current `text-[10.5px]` mono-everywhere look is deliberately broken: rows use the same scale as Validate's existing labels.

Keep it under 200 lines. If `buildCodeChecks` and `buildPolicyChecksWithKMin` were inline-only, move them into `companion/validate-checks.ts` and import.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm vitest run tests/unit/components/companion/validate-tab.test.tsx`
Expected: 3 PASS.

- [ ] **Step 5: Wire into shell**

In `companion-panel.tsx`, replace the existing `<TabsContent value="validate">` body with `<TabsContent value="validate" className="m-0 h-full"><ValidateTab /></TabsContent>`. Delete the inline Validate JSX block.

- [ ] **Step 6: Visual review via Playwright MCP**

Take screenshots at light + dark, 1440 + 768 widths:
- `verify-task-4-validate-light-1440.png`
- `verify-task-4-validate-dark-1440.png`
- `verify-task-4-validate-768.png`

Dispatch the `ui-design-reviewer` agent to judge. Iterate via the visual-fix loop until VERIFIED.

- [ ] **Step 7: Commit**

```bash
git add components/v2/features/cp/companion/validate-tab.tsx components/v2/features/cp/companion/companion-panel.tsx tests/unit/components/companion/validate-tab.test.tsx
git commit -m "feat(cp): Validate tab as flat severity-sorted problem-list

Failing/warning rows float to top; each row exposes an inline jump-to-fix
action where one exists. Submit button moves into the header row next to
the aggregate status pill.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Dry-run tab — spreadsheet preview with column-stats popovers

**Files:**
- Create: `components/v2/features/cp/companion/dryrun-tab.tsx`
- Create: `components/v2/features/cp/companion/column-stats-popover.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`

- [ ] **Step 1: Implement the column-stats popover**

Create `column-stats-popover.tsx`. Receives `{ columnName: string; stats: { min: string; max: string; nulls: number; total: number; topValues: { value: string; count: number }[]; sparkline: number[] } }`. Renders a `<Popover>` using the existing shadcn primitive in `components/ui/popover.tsx`:

```tsx
'use client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// ...
export function ColumnStatsPopover({ columnName, stats, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 border-v2-border bg-v2-surface p-3">
        <p className="font-mono text-[11px] font-medium text-v2-foreground">{columnName}</p>
        <dl className="mt-2 space-y-1 font-mono text-[10.5px]">
          <div className="flex justify-between"><dt className="text-v2-muted">Range</dt><dd className="tabular-nums">{stats.min} – {stats.max}</dd></div>
          <div className="flex justify-between"><dt className="text-v2-muted">Nulls</dt><dd className="tabular-nums">{stats.nulls} / {stats.total}</dd></div>
        </dl>
        {/* sparkline + top values */}
      </PopoverContent>
    </Popover>
  )
}
```

The sparkline can be a simple `<svg viewBox="0 0 60 16">` with a `<polyline>`.

- [ ] **Step 2: Implement the `DryRunTab`**

Create `dryrun-tab.tsx`. Reads `code`, `vault` from context. Derives `selectColumns`, `hasFrom`, `canShowDryRun` the same way the inline panel does (re-export `parseSelectColumns` and `hasFromClause` from `analysis-workbench.tsx` or extract them to `companion/sql-parse.ts`).

Render structure:

```tsx
return (
  <div className="px-4 py-3 space-y-3">
    <Toolbar /> {/* snapshot ts · row count · scan time · Limit select · Re-run btn */}
    {!canShowDryRun
      ? <EmptyState /> // existing copy
      : <PreviewTable columns={selectColumns} rows={SAMPLE_ROWS} />}
  </div>
)
```

`PreviewTable` headers stack three rows: name + type, lineage chip (`extractLineageRefs` re-used from current panel), and a hover/click target that wraps with `<ColumnStatsPopover>`. Cells render with `isNumericValue` right-align logic carried over.

- [ ] **Step 3: Wire into shell**

Replace `<TabsContent value="dryrun">` body with `<DryRunTab />`.

- [ ] **Step 4: Visual review via Playwright MCP**

Screenshots: `verify-task-5-dryrun-empty.png`, `verify-task-5-dryrun-filled.png`, `verify-task-5-dryrun-popover.png` (hover/click a column header). Dispatch `ui-design-reviewer`. Iterate via visual-fix loop until VERIFIED.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/cp/companion/dryrun-tab.tsx components/v2/features/cp/companion/column-stats-popover.tsx components/v2/features/cp/companion/companion-panel.tsx
git commit -m "feat(cp): Dry-run tab with column-stats popovers

Headers stack name+type, lineage chip, and a popover target with range,
nulls, and a sparkline. Lineage chips move out of cells — cells stay
clean for high-density scanning.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Tests tab — inline visual assertion builder

**Files:**
- Create: `components/v2/features/cp/companion/tests-tab.tsx`
- Create: `components/v2/features/cp/companion/assertion-row.tsx`
- Create: `components/v2/features/cp/companion/use-assertions.ts` — reducer state hook
- Create: `tests/unit/components/companion/tests-tab.test.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`

- [ ] **Step 1: Define the Assertion type and reducer**

Create `use-assertions.ts`:

```ts
import { useReducer, useCallback } from 'react'

export type AssertionOperator =
  | 'not_null' | 'unique' | 'range' | 'between' | 'eq' | 'regex' | 'freshness'

export type AssertionStatus = 'will-run' | 'passed' | 'failed'

export type Assertion = {
  id: string
  column: string
  operator: AssertionOperator
  value?: string
  value2?: string // for between/range
  status: AssertionStatus
  failingRows?: Record<string, string>[]
}

type Action =
  | { type: 'add'; column: string; operator: AssertionOperator }
  | { type: 'update'; id: string; patch: Partial<Assertion> }
  | { type: 'delete'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'run-one'; id: string }
  | { type: 'run-all' }
  | { type: 'sync-columns'; existing: string[] }

function reducer(state: Assertion[], action: Action): Assertion[] {
  switch (action.type) {
    case 'add': {
      const id = `${action.column}-${action.operator}-${Date.now()}`
      return [...state, { id, column: action.column, operator: action.operator, status: 'will-run' }]
    }
    case 'update':
      return state.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a))
    case 'delete':
      return state.filter((a) => a.id !== action.id)
    case 'duplicate': {
      const src = state.find((a) => a.id === action.id)
      if (!src) return state
      return [...state, { ...src, id: `${src.id}-copy-${Date.now()}` }]
    }
    case 'run-one':
      return state.map((a) =>
        a.id === action.id ? { ...a, status: Math.random() > 0.3 ? 'passed' : 'failed' } : a,
      )
    case 'run-all':
      return state.map((a) => ({ ...a, status: Math.random() > 0.3 ? 'passed' : 'failed' as AssertionStatus }))
    case 'sync-columns':
      return state.map((a) =>
        action.existing.includes(a.column)
          ? a
          : { ...a, status: 'failed', failingRows: [{ note: 'Column no longer exists' }] },
      )
  }
}

export function useAssertions(initial: Assertion[] = []) {
  const [assertions, dispatch] = useReducer(reducer, initial)
  return {
    assertions,
    add: useCallback((column: string, operator: AssertionOperator) => dispatch({ type: 'add', column, operator }), []),
    update: useCallback((id: string, patch: Partial<Assertion>) => dispatch({ type: 'update', id, patch }), []),
    remove: useCallback((id: string) => dispatch({ type: 'delete', id }), []),
    duplicate: useCallback((id: string) => dispatch({ type: 'duplicate', id }), []),
    runOne: useCallback((id: string) => dispatch({ type: 'run-one', id }), []),
    runAll: useCallback(() => dispatch({ type: 'run-all' }), []),
    syncColumns: useCallback((existing: string[]) => dispatch({ type: 'sync-columns', existing }), []),
  }
}
```

The `Math.random()` mock for run results matches the rest of the workbench's "fixtures pretending to be live data" pattern. Real persistence is out of scope per spec §6.7.

- [ ] **Step 2: Write the tab smoke test**

Create `tests-tab.test.tsx`. Render the tab with a context that has a vault and code with a few SELECT aliases. Assert:
- `screen.getByRole('button', { name: /run all/i })` is in the document.
- Clicking `+ Add not_null` adds an assertion row.
- Each quick-pick chip exists.

(Test code follows the same RTL pattern as Task 4 — adapt as needed.)

- [ ] **Step 3: Implement `AssertionRow`**

A single inline-editable row component. Props: `{ assertion: Assertion; columns: string[]; onUpdate; onRemove; onDuplicate; onRunOne }`. Renders inline `<select>` for column, `<select>` for operator, `<input>` for value(s), status pill, ⋯ menu (shadcn `<DropdownMenu>` from `components/ui/dropdown-menu.tsx`).

- [ ] **Step 4: Implement `TestsTab`**

```tsx
export function TestsTab() {
  const { code, vault } = useCompanionContext()
  const selectColumns = parseSelectColumns(code, vault)
  const columnNames = selectColumns.map((c) => c.alias)
  const initial = buildAssertions(selectColumns) // seeds from existing helper
  const { assertions, add, update, remove, duplicate, runOne, runAll, syncColumns } = useAssertions(initial)

  useEffect(() => {
    syncColumns(columnNames)
  }, [columnNames.join(','), syncColumns])

  if (selectColumns.length === 0) {
    return <EmptyState>Write a SELECT statement to define assertions on output columns.</EmptyState>
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <Header count={assertions.length} onRunAll={runAll} />
      <ul role="list" className="space-y-1.5">
        {assertions.map((a) => (
          <AssertionRow key={a.id} assertion={a} columns={columnNames} onUpdate={update} onRemove={remove} onDuplicate={duplicate} onRunOne={runOne} />
        ))}
      </ul>
      <QuickPickChips columns={columnNames} onAdd={add} />
    </div>
  )
}
```

- [ ] **Step 5: Wire into shell + visual review**

Same pattern as Task 4. Screenshots: `verify-task-6-tests-empty.png`, `verify-task-6-tests-filled.png`, `verify-task-6-tests-edit.png`, `verify-task-6-tests-failed-expanded.png`.

Dispatch `ui-design-reviewer` + `accessibility-auditor` (assertion-row dropdowns must keyboard-navigate).

- [ ] **Step 6: Commit**

```bash
git add components/v2/features/cp/companion/tests-tab.tsx components/v2/features/cp/companion/assertion-row.tsx components/v2/features/cp/companion/use-assertions.ts components/v2/features/cp/companion/companion-panel.tsx tests/unit/components/companion/tests-tab.test.tsx
git commit -m "feat(cp): Tests tab with inline visual assertion builder

Each assertion is a row that edits in place (column · operator · value).
Quick-pick chips add common operators with sensible defaults.
Per-row run + duplicate + delete via overflow menu.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Schedule & Cost tab — timeline + cost cards + budget cap

**Files:**
- Create: `components/v2/features/cp/companion/schedule-tab.tsx`
- Create: `components/v2/features/cp/companion/cost-bars.tsx`
- Create: `components/v2/features/cp/companion/execution-timeline.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`

- [ ] **Step 1: Implement `ExecutionTimeline`**

A horizontal SVG strip showing 5 dots equally spaced. Each dot is a `<circle>` with a `<title>` for full timestamp (acts as native tooltip). Below each dot, a small label (`Mon`, `14:00`).

Props: `{ executions: Date[] | null; mode: 'cron' | 'event' | 'manual'; eventSource?: string }`. When `mode !== 'cron'`, render the existing copy ("Triggered on demand only", "On {eventSource}", "Could not parse cron expression").

- [ ] **Step 2: Implement `CostBars`**

Props: `{ rows: { label: string; amount: number; total: number }[] }`. Each row: label, dollar amount right-aligned, plus a proportional bar (width = `amount / max * 100%`) in `bg-v2-foreground/[0.06]`. Pair the bar with the number — the visual must reinforce ranking, not replace it.

- [ ] **Step 3: Implement `ScheduleTab`**

Reads `triggerKind`, `cronExpr`, `eventSource`, `onchainDests` from context. Computes `nextExecutions`, `runsIn30Days`, `monthlyCost`, per-component breakdown (compute, gas per destination, webhook).

Render:

```tsx
<div className="px-4 py-3 space-y-4">
  <TriggerSummary triggerKind={triggerKind} cronExpr={cronExpr} eventSource={eventSource} />
  <ExecutionTimeline executions={nextExecutions} mode={triggerKind} eventSource={eventSource} />
  <CostCards perExec={totalCostPerExec} perDay={...} perMonth={monthlyCost} />
  <CostBars rows={[{ label: 'Compute', amount: COMPUTE_COST_PER_EXEC, total: totalCostPerExec }, ...gasRows, webhookRow]} />
  <BudgetCap />
</div>
```

`BudgetCap` is a stateful row with a numeric input + period select (`/ month` / `/ day`) + "Alert at 80%" checkbox. Stores to `localStorage` keyed by analysis id (graceful no-op when id is unknown — flag with `// TODO: persist via API once endpoint exists` per spec §6.7).

The `BudgetCap` row also writes a derived `warn` check that the Validate tab picks up — but rather than threading state cross-tab right now, just compute the warn in Validate using the same `localStorage` lookup. Both tabs are leaves of the same panel; this is acceptable for V1.

- [ ] **Step 4: Wire into shell + visual review**

Screenshots: `verify-task-7-schedule-cron.png`, `verify-task-7-schedule-event.png`, `verify-task-7-schedule-manual.png`, `verify-task-7-schedule-budget-warning.png`.

Dispatch `ui-design-reviewer`. Iterate until VERIFIED.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/cp/companion/schedule-tab.tsx components/v2/features/cp/companion/cost-bars.tsx components/v2/features/cp/companion/execution-timeline.tsx components/v2/features/cp/companion/companion-panel.tsx
git commit -m "feat(cp): Schedule & Cost tab with visual timeline + cost bars

Replaces the numbered execution list with a horizontal timeline strip.
Adds proportional cost bars and a budget cap with 80% alert. Cap
warning surfaces in the Validate tab when projected monthly cost
exceeds it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Integration tab — payload contract + language switcher (lazy Shiki)

**Files:**
- Create: `components/v2/features/cp/companion/integration-tab.tsx`
- Create: `components/v2/features/cp/companion/integration-codegen.ts`
- Create: `components/v2/features/cp/companion/payload-contract-table.tsx`
- Create: `tests/unit/components/companion/integration-codegen.test.ts`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`
- Modify: `package.json` — add `shiki`

- [ ] **Step 1: Add `shiki` to package.json**

```bash
pnpm add shiki
```

- [ ] **Step 2: Write the codegen failing test**

Create `tests/unit/components/companion/integration-codegen.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  generateCode,
  type PayloadField,
} from '@/components/v2/features/cp/companion/integration-codegen'

const fields: PayloadField[] = [
  { name: 'asof', sqlType: 'TIMESTAMP', abiType: 'uint64', exampleSql: '2026-05-15…', exampleAbi: '1715789138', source: 'derived' },
  { name: 'nav', sqlType: 'NUMERIC', abiType: 'uint256', exampleSql: '1.024500', exampleAbi: '1024500000000000000', source: 'vault.acred.nav_calc' },
  { name: 'asset_count', sqlType: 'INT', abiType: 'uint16', exampleSql: '47', exampleAbi: '47', source: 'vault.acred.asset_count' },
]

describe('generateCode', () => {
  it('emits Solidity with abi.decode order matching the field list', () => {
    const out = generateCode('solidity', fields, { contractAddress: '0xabc', analysisSlug: 'nav_daily' })
    expect(out).toMatch(/abi\.decode\(payload, \(uint64, uint256, uint16\)\)/)
    expect(out).toContain('"nav_daily"')
  })

  it('emits TypeScript with each field as a typed const', () => {
    const out = generateCode('typescript', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain("result.asof")
    expect(out).toContain("result.nav")
    expect(out).toContain("result.asset_count")
  })

  it('emits Python equivalent with the same field names', () => {
    const out = generateCode('python', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('result["asof"]')
    expect(out).toContain('result["nav"]')
  })

  it('emits Rust equivalent', () => {
    const out = generateCode('rust', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('asof:')
    expect(out).toContain('nav:')
  })

  it('emits curl with the analysis slug in the URL', () => {
    const out = generateCode('curl', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('/analyses/nav_daily/read')
  })
})
```

- [ ] **Step 3: Run test to verify failure**

Run: `pnpm vitest run tests/unit/components/companion/integration-codegen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `integration-codegen.ts`**

Create the module:

```ts
export type IntegrationLanguage = 'solidity' | 'typescript' | 'python' | 'rust' | 'curl'

export type PayloadField = {
  name: string
  sqlType: string
  abiType: string
  exampleSql: string
  exampleAbi: string
  source: string
}

export type CodegenOpts = {
  analysisSlug: string
  contractAddress?: string
  contractLabel?: string
}

export function generateCode(
  lang: IntegrationLanguage,
  fields: PayloadField[],
  opts: CodegenOpts,
): string {
  switch (lang) {
    case 'solidity': return solidity(fields, opts)
    case 'typescript': return typescriptCode(fields, opts)
    case 'python': return python(fields, opts)
    case 'rust': return rust(fields, opts)
    case 'curl': return curl(fields, opts)
  }
}

function solidity(fields: PayloadField[], opts: CodegenOpts): string {
  const abiTypes = fields.map((f) => f.abiType).join(', ')
  const decodeNames = fields.map((f) => f.name).join(', ')
  return `interface IHyveOracle {
  function read(string calldata analysis) external view returns (bytes memory payload, uint64 asOf, bytes memory signature);
}

contract YourVault {
  IHyveOracle constant ORACLE = IHyveOracle(${opts.contractAddress ?? '0x0000000000000000000000000000000000000000'});

  function readPayload() external view {
    (bytes memory payload, uint64 asOf, bytes memory sig) = ORACLE.read("${opts.analysisSlug}");
    require(block.timestamp - asOf < 1 hours, "stale");
    (${decodeNames}) = abi.decode(payload, (${abiTypes}));
  }
}`
}

function typescriptCode(fields: PayloadField[], opts: CodegenOpts): string {
  const reads = fields.map((f) => `console.log(result.${f.name}) // ${f.exampleSql}`).join('\n')
  return `import { HyveClient } from '@hyve/client'

const client = new HyveClient({ orgId: 'org_gauntlet' })
const result = await client.read('${opts.analysisSlug}', { verify: true })

${reads}`
}

function python(fields: PayloadField[], opts: CodegenOpts): string {
  const reads = fields.map((f) => `print(result["${f.name}"])  # ${f.exampleSql}`).join('\n')
  return `from hyve import HyveClient

client = HyveClient(org_id="org_gauntlet")
result = client.read("${opts.analysisSlug}", verify=True)

${reads}`
}

function rust(fields: PayloadField[], opts: CodegenOpts): string {
  const reads = fields.map((f) => `    ${f.name}: ${f.exampleAbi},`).join('\n')
  return `use hyve::HyveClient;

let client = HyveClient::new("org_gauntlet");
let result = client.read("${opts.analysisSlug}").verify().await?;

println!("{:#?}", Payload {
${reads}
});`
}

function curl(_fields: PayloadField[], opts: CodegenOpts): string {
  return `curl -X GET https://api.hyve.app/v1/analyses/${opts.analysisSlug}/read \\
  -H "Authorization: Bearer $HYVE_TOKEN" \\
  -H "Accept: application/json"`
}
```

- [ ] **Step 5: Run test to verify pass**

Run: `pnpm vitest run tests/unit/components/companion/integration-codegen.test.ts`
Expected: 5 PASS.

- [ ] **Step 6: Implement `PayloadContractTable`**

Three columns: `field`, `type` (ABI type + SQL type subtle), `example` (ABI example + SQL example below), `source` (lineage chip). Use existing typography (`font-mono text-[11px]`).

Includes a `[ Copy ABI ]` button that calls a `buildAbiFragment(fields)` helper (write inline in the table component or in `integration-codegen.ts`).

- [ ] **Step 7: Implement `IntegrationTab`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useCompanionContext } from './companion-context'
import { generateCode, type IntegrationLanguage, type PayloadField } from './integration-codegen'

const LANGS: IntegrationLanguage[] = ['solidity', 'typescript', 'python', 'rust', 'curl']

export function IntegrationTab() {
  const { code, vault, onchainDests, name } = useCompanionContext()
  const [lang, setLang] = useState<IntegrationLanguage>('solidity')
  const [destIndex, setDestIndex] = useState(0)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const fields = useMemo<PayloadField[]>(() => deriveFields(code, vault), [code, vault])
  const dest = onchainDests[destIndex] ?? null
  const source = generateCode(lang, fields, {
    analysisSlug: name.trim() || 'analysis_name',
    contractAddress: dest?.address,
    contractLabel: dest?.label,
  })

  // Lazy-load Shiki only when this tab mounts.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { codeToHtml } = await import('shiki')
      const html = await codeToHtml(source, { lang: shikiLang(lang), theme: 'github-dark' })
      if (!cancelled) setHighlighted(html)
    })()
    return () => { cancelled = true }
  }, [source, lang])

  return (
    <div className="px-4 py-3 space-y-3">
      <PayloadContractTable fields={fields} />
      <LanguageSwitcher value={lang} onChange={setLang} options={LANGS} />
      {onchainDests.length > 1 && <DestinationSelector value={destIndex} onChange={setDestIndex} dests={onchainDests} />}
      {highlighted
        ? <div dangerouslySetInnerHTML={{ __html: highlighted }} className="rounded-lg overflow-hidden text-[11px]" />
        : <pre className="rounded-lg border border-v2-border/60 p-4 font-mono text-[10.5px] whitespace-pre overflow-x-auto">{source}</pre>}
      <Collapsible label="Sample signed payload" defaultOpen={false}>{/* … */}</Collapsible>
      <Collapsible label="Signature verification" defaultOpen={false}>{/* verifyTsCode rendered with lang switch */}</Collapsible>
    </div>
  )
}

function shikiLang(l: IntegrationLanguage): string {
  if (l === 'solidity') return 'solidity'
  if (l === 'typescript') return 'typescript'
  if (l === 'python') return 'python'
  if (l === 'rust') return 'rust'
  return 'bash'
}
```

`deriveFields` takes the editor's SELECT aliases plus the destination's ABI mapping and returns `PayloadField[]`. Reuse `parseSelectColumns` and `extractLineageRefs` from the current panel.

- [ ] **Step 8: Wire into shell + visual review**

Screenshots: `verify-task-8-integration-solidity.png`, `verify-task-8-integration-ts.png`, `verify-task-8-integration-python.png`, `verify-task-8-integration-rust.png`, `verify-task-8-integration-curl.png`, `verify-task-8-integration-multi-dest.png`. Dispatch `ui-design-reviewer`.

- [ ] **Step 9: Commit**

```bash
git add components/v2/features/cp/companion/integration-tab.tsx components/v2/features/cp/companion/integration-codegen.ts components/v2/features/cp/companion/payload-contract-table.tsx components/v2/features/cp/companion/companion-panel.tsx tests/unit/components/companion/integration-codegen.test.ts package.json pnpm-lock.yaml
git commit -m "feat(cp): Integration tab with payload contract + 5-language codegen

Top half: structured payload contract (field/type/example/source) derived
from the editor's SELECT aliases. Bottom half: Solidity / TypeScript /
Python / Rust / curl switcher with auto-generated consumer code.

Shiki highlighter is dynamically imported only when this tab mounts so
the rest of the workbench does not pay the bundle cost.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Terminal shell + mode switcher (Bridge placeholder)

**Files:**
- Create: `components/v2/features/cp/companion/terminal/terminal-tab.tsx`
- Create: `components/v2/features/cp/companion/terminal/bridge-mode.tsx`
- Modify: `components/v2/features/cp/companion/companion-panel.tsx`

- [ ] **Step 1: Implement `TerminalTab`**

```tsx
'use client'
import { useState } from 'react'
import type { TerminalMode } from '../companion-panel.types'
import { BridgeMode } from './bridge-mode'
import { AssistantMode } from './assistant-mode'
import { CliMode } from './cli-mode'
import { useCompanionContext } from '../companion-context'

const MODES: { value: TerminalMode; label: string }[] = [
  { value: 'bridge', label: 'Bridge' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'cli', label: 'CLI' },
]

export function TerminalTab() {
  const { vault } = useCompanionContext()
  const [mode, setMode] = useState<TerminalMode>(() => {
    if (typeof window === 'undefined') return 'cli'
    const stored = sessionStorage.getItem('analysis-workbench:terminal-mode')
    return (stored as TerminalMode) ?? 'cli'
  })
  const onChange = (m: TerminalMode) => {
    setMode(m)
    sessionStorage.setItem('analysis-workbench:terminal-mode', m)
  }

  const slug = vault?.slug ?? 'workbench'
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-v2-border/60 px-3 py-1.5">
        <div role="tablist" aria-label="Terminal mode" className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              role="tab"
              aria-selected={mode === m.value}
              tabIndex={mode === m.value ? 0 : -1}
              onClick={() => onChange(m.value)}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10.5px] transition-colors',
                mode === m.value
                  ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                  : 'text-v2-muted hover:text-v2-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-v2-muted">hyve@{slug} · {time}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'bridge' && <BridgeMode />}
        {mode === 'assistant' && <AssistantMode />}
        {mode === 'cli' && <CliMode />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `BridgeMode` (UI mock)**

Renders:
- Status row: `● Connected` (mocked) + agent name + key fingerprint.
- Connection panel: a read-only `wss://hyve.app/agent/<token>` string + Copy button + Revoke button (disabled with tooltip "Beta — endpoint not live").
- "Beta" pill with a tooltip "The bridge endpoint isn't live yet. This UI demonstrates the eventual UX."
- Tool palette (left, 180px wide): list of toggleable tools (state: `useState<Set<ToolName>>`).
- Event log (right, fills): a `<ul role="log" aria-live="polite">` with ~5 fake events. Gate the fake stream behind a "Demo data ▾" select that defaults to "Off".
- Kill switch (red ghost button at bottom).

This is intentionally a mock — see spec §6.1 and §7.

- [ ] **Step 3: Stub `assistant-mode.tsx` and `cli-mode.tsx`**

For now, both files export a component that renders "Coming online…" — they will be implemented in Tasks 10–12. This lets Task 9 ship without import errors.

- [ ] **Step 4: Wire into shell**

Replace the Task 3 placeholder `<TabsContent value="terminal">` body with `<TerminalTab />`.

- [ ] **Step 5: Visual review**

Screenshots: `verify-task-9-bridge.png`. Dispatch `ui-design-reviewer`. Verify the Beta label is honest and the demo toggle is off by default.

- [ ] **Step 6: Commit**

```bash
git add components/v2/features/cp/companion/terminal/ components/v2/features/cp/companion/companion-panel.tsx
git commit -m "feat(cp): Terminal tab shell with Bridge mode UI mock

Mode switcher between Bridge / Assistant / CLI. Bridge shows the
eventual external-agent connection UX honestly labelled Beta, with the
fake event stream gated behind an off-by-default demo toggle.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Terminal CLI mode — parser + REPL

**Files:**
- Create: `components/v2/features/cp/companion/terminal/cli-commands.ts`
- Create: `tests/unit/components/companion/cli-commands.test.ts`
- Modify: `components/v2/features/cp/companion/terminal/cli-mode.tsx`

- [ ] **Step 1: Write the failing test for the parser**

Create `tests/unit/components/companion/cli-commands.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCommand, listCommands, completeCommand } from '@/components/v2/features/cp/companion/terminal/cli-commands'

describe('parseCommand', () => {
  it('parses a bare command', () => {
    expect(parseCommand('validate')).toEqual({ name: 'validate', args: [], flags: {} })
  })
  it('parses flags with values', () => {
    expect(parseCommand('dry-run --limit 5')).toEqual({ name: 'dry-run', args: [], flags: { limit: '5' } })
  })
  it('parses boolean flags', () => {
    expect(parseCommand('sign --dry')).toEqual({ name: 'sign', args: [], flags: { dry: true } })
  })
  it('parses positional args', () => {
    expect(parseCommand('diff main')).toEqual({ name: 'diff', args: ['main'], flags: {} })
  })
  it('returns null for empty input', () => {
    expect(parseCommand('   ')).toBeNull()
  })
})

describe('completeCommand', () => {
  it('returns matching command names for a prefix', () => {
    expect(completeCommand('val')).toEqual(['validate'])
    expect(completeCommand('d')).toEqual(expect.arrayContaining(['dry-run', 'diff']))
  })
  it('returns empty array on no match', () => {
    expect(completeCommand('zzz')).toEqual([])
  })
})

describe('listCommands', () => {
  it('includes the documented commands', () => {
    const names = listCommands().map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['validate', 'dry-run', 'diff', 'sign', 'tests', 'cost', 'help', 'clear', 'history']),
    )
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run tests/unit/components/companion/cli-commands.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli-commands.ts`**

```ts
export type ParsedCommand = { name: string; args: string[]; flags: Record<string, string | true> }

export type CommandDef = {
  name: string
  summary: string
  // executor receives the workbench's CompanionContextValue + parsed command.
  run: (input: ParsedCommand, ctx: import('../companion-panel.types').CompanionContextValue) => CliOutputBlock[]
}

export type CliOutputBlock =
  | { kind: 'text'; lines: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'error'; message: string }

const COMMANDS: CommandDef[] = [
  {
    name: 'validate',
    summary: 'Run all pre-submit checks.',
    run: (_, ctx) => {
      // Re-uses the same check builders the Validate tab uses.
      // Returns a text block summarising pass/fail counts.
      // (Fill in body — wrap buildCodeChecks + buildPolicyChecksWithKMin.)
      return [{ kind: 'text', lines: ['✓ syntax', '✓ policy', '✓ lineage', '⚠ no tests'] }]
    },
  },
  {
    name: 'dry-run',
    summary: 'Preview output rows for the current SELECT.',
    run: (input, _ctx) => {
      const limit = parseInt(String(input.flags.limit ?? '5'), 10)
      // Render a table block; data from SAMPLE_ROWS fixture.
      return [/* … */]
    },
  },
  {
    name: 'diff',
    summary: 'Diff current analysis against another ref. Usage: hyve diff <ref>',
    run: (input) => input.args[0]
      ? [{ kind: 'text', lines: [`+3 −1 lines vs ${input.args[0]} · 2 new columns`] }]
      : [{ kind: 'error', message: 'Usage: hyve diff <ref>' }],
  },
  { name: 'sign', summary: 'Show what the signed payload would look like. Use --dry to skip side-effects.', run: (_, _ctx) => [/* … */] },
  { name: 'tests', summary: 'Run assertions. Usage: hyve tests run', run: (_, _ctx) => [/* … */] },
  { name: 'cost', summary: 'Show estimated cost per execution.', run: (_, _ctx) => [/* … */] },
  { name: 'help', summary: 'List commands or show help for one.', run: () => [{ kind: 'text', lines: COMMANDS.map((c) => `${c.name.padEnd(10)} ${c.summary}`) }] },
  { name: 'clear', summary: 'Clear scrollback.', run: () => [] }, // CLI mode treats clear specially.
  { name: 'history', summary: 'Show recent commands.', run: () => [/* state-managed in cli-mode */] },
]

export function listCommands(): CommandDef[] {
  return COMMANDS
}

export function parseCommand(raw: string): ParsedCommand | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const tokens = trimmed.split(/\s+/)
  const name = tokens.shift()!
  const args: string[] = []
  const flags: Record<string, string | true> = {}
  while (tokens.length) {
    const t = tokens.shift()!
    if (t.startsWith('--')) {
      const key = t.slice(2)
      const next = tokens[0]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        tokens.shift()
      } else {
        flags[key] = true
      }
    } else {
      args.push(t)
    }
  }
  return { name, args, flags }
}

export function completeCommand(prefix: string): string[] {
  if (!prefix) return COMMANDS.map((c) => c.name)
  return COMMANDS.map((c) => c.name).filter((n) => n.startsWith(prefix))
}

export function runCommand(raw: string, ctx: import('../companion-panel.types').CompanionContextValue): CliOutputBlock[] {
  const parsed = parseCommand(raw)
  if (!parsed) return []
  if (parsed.name === 'clear') return [] // signal handled in cli-mode
  const def = COMMANDS.find((c) => c.name === parsed.name)
  if (!def) return [{ kind: 'error', message: `Unknown command: ${parsed.name}. Try \`help\`.` }]
  return def.run(parsed, ctx)
}
```

Fill in the `run: () => [/* … */]` bodies before completing this step — each should wrap an existing helper from `analysis-workbench.tsx` (re-use, do not re-implement). The plan keeps these short for readability — the code does not.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm vitest run tests/unit/components/companion/cli-commands.test.ts`
Expected: tests pass.

- [ ] **Step 5: Implement `CliMode`**

```tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCompanionContext } from '../companion-context'
import { parseCommand, runCommand, completeCommand, type CliOutputBlock } from './cli-commands'

type ScrollbackEntry = { input: string; outputs: CliOutputBlock[] }

const MAX_HISTORY = 200

export function CliMode() {
  const ctx = useCompanionContext()
  const [scrollback, setScrollback] = useState<ScrollbackEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [scrollback])

  const submit = useCallback(() => {
    const raw = draft.trim()
    if (!raw) return
    const parsed = parseCommand(raw)
    if (parsed?.name === 'clear') {
      setScrollback([])
    } else {
      const outputs = runCommand(raw, ctx)
      setScrollback((s) => [...s, { input: raw, outputs }].slice(-MAX_HISTORY))
    }
    setHistory((h) => [raw, ...h].slice(0, MAX_HISTORY))
    setHistoryIdx(-1)
    setDraft('')
  }, [draft, ctx])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Tab') {
      e.preventDefault()
      const matches = completeCommand(draft)
      if (matches.length === 1) setDraft(matches[0] + ' ')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(next)
      setDraft(history[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(historyIdx - 1, -1)
      setHistoryIdx(next)
      setDraft(next === -1 ? '' : history[next])
    }
  }

  return (
    <div className="flex flex-col h-full bg-v2-foreground/[0.02] font-mono text-[11px]" onClick={() => inputRef.current?.focus()}>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
        {scrollback.map((e, i) => (
          <div key={i}>
            <div className="text-v2-muted">$ {e.input}</div>
            {e.outputs.map((o, j) => <OutputBlock key={j} block={o} />)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-1 border-t border-v2-border/60 px-3 py-1.5">
        <span className="text-v2-muted">$</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          aria-label="Terminal input"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-v2-foreground"
        />
      </div>
    </div>
  )
}

function OutputBlock({ block }: { block: CliOutputBlock }) {
  if (block.kind === 'text') return <pre className="whitespace-pre-wrap text-v2-foreground">{block.lines.join('\n')}</pre>
  if (block.kind === 'error') return <pre className="text-v2-danger">{block.message}</pre>
  // table:
  return (
    <table className="text-[10.5px]">
      <thead><tr>{block.headers.map((h) => <th key={h} className="text-left text-v2-muted px-2">{h}</th>)}</tr></thead>
      <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2">{c}</td>)}</tr>)}</tbody>
    </table>
  )
}
```

- [ ] **Step 6: Visual review**

Screenshots: `verify-task-10-cli-empty.png`, `verify-task-10-cli-help.png`, `verify-task-10-cli-dry-run.png`. Dispatch `ui-design-reviewer` + `accessibility-auditor` (input must be reachable by keyboard alone; output region uses appropriate role).

- [ ] **Step 7: Commit**

```bash
git add components/v2/features/cp/companion/terminal/cli-mode.tsx components/v2/features/cp/companion/terminal/cli-commands.ts tests/unit/components/companion/cli-commands.test.ts
git commit -m "feat(cp): Terminal CLI mode — in-browser hyve REPL

Real frontend command parser + scrollback. Commands wrap existing
workbench helpers (validate / dry-run / diff / sign / tests / cost /
help / clear / history). Tab completion, up/down history capped at 200,
no xterm.js dependency.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Terminal Assistant mode — BYO key chat (AI SDK v6 via Vercel AI Gateway)

**Files:**
- Modify: `components/v2/features/cp/companion/terminal/assistant-mode.tsx`
- Create: `components/v2/features/cp/companion/terminal/assistant-key-prompt.tsx`
- Create: `components/v2/features/cp/companion/terminal/assistant-diff-proposal.tsx`
- Modify: `package.json` — add `ai`, `react-markdown`, `remark-gfm`

- [ ] **Step 1: Add dependencies**

```bash
pnpm add ai react-markdown remark-gfm
```

- [ ] **Step 2: Implement `AssistantKeyPrompt`**

A first-run setup card asking for provider + key. Provider options: `Anthropic (via Vercel AI Gateway)`, `OpenAI`, `OpenRouter`. Key is stored to `localStorage` under `hyve:assistant:key:<provider>`. Show explicit disclosure: "Your key is stored only in this browser. Hyve cannot read it." plus a `Remove key` button visible once a key is present.

```tsx
export type AssistantConfig = { provider: 'anthropic-gateway' | 'openai' | 'openrouter'; key: string }

const KEY_PREFIX = 'hyve:assistant:key:'

export function loadConfig(): AssistantConfig | null {
  if (typeof window === 'undefined') return null
  const provider = (localStorage.getItem('hyve:assistant:provider') as AssistantConfig['provider'] | null) ?? null
  if (!provider) return null
  const key = localStorage.getItem(KEY_PREFIX + provider)
  if (!key) return null
  return { provider, key }
}

export function saveConfig(c: AssistantConfig) {
  localStorage.setItem('hyve:assistant:provider', c.provider)
  localStorage.setItem(KEY_PREFIX + c.provider, c.key)
}

export function clearConfig() {
  const provider = localStorage.getItem('hyve:assistant:provider')
  if (provider) localStorage.removeItem(KEY_PREFIX + provider)
  localStorage.removeItem('hyve:assistant:provider')
}
```

- [ ] **Step 3: Implement `AssistantMode` chat**

Wire AI SDK v6 with the BYO key. Use plain `"anthropic/claude-sonnet-4-6"` model strings through Vercel AI Gateway when the provider is `anthropic-gateway`. For OpenAI / OpenRouter, the SDK falls back to provider-specific endpoints.

The chat thread:
- A scrollable `role=log aria-live=polite` region with user + assistant turns. Assistant messages render through `react-markdown` (lazy-loaded with `dynamic` from Next.js, or `import('react-markdown')`).
- A textarea at the bottom with Enter-to-send / Shift+Enter newline.
- A system prompt that injects the current analysis state: `name`, vault slug, code, destinations (formatted as a short context block).
- Each assistant turn that contains a fenced ```sql block is interpreted as a proposed edit. The `AssistantDiffProposal` component renders a unified diff between the current `code` and the proposed code, with `Apply` / `Discard` buttons. `Apply` calls a callback that writes back to the Monaco editor.

To write back to the editor, the assistant needs to dispatch up through context. Add an optional `onCodeChange?: (next: string) => void` to `CompanionContextValue` — `analysis-workbench.tsx` passes its existing `setCode` setter. Tabs that don't care ignore it.

The diff render uses a simple line-by-line comparator (no need for a full diff library — write a 30-line `lineDiff(a, b)` helper).

- [ ] **Step 4: Visual review + security review**

Screenshots: `verify-task-11-assistant-setup.png`, `verify-task-11-assistant-chat.png`, `verify-task-11-assistant-diff.png`. Dispatch `ui-design-reviewer`.

**Then dispatch `security-reviewer`** with the prompt: "Review the BYO-key handling in `components/v2/features/cp/companion/terminal/assistant-mode.tsx` and `assistant-key-prompt.tsx`. Verify the key is only stored in `localStorage`, never POSTed to Hyve's own backend, and the CSP allows only the chosen provider's origin. Confirm the `Remove key` flow is reachable and irreversible."

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/cp/companion/terminal/assistant-mode.tsx components/v2/features/cp/companion/terminal/assistant-key-prompt.tsx components/v2/features/cp/companion/terminal/assistant-diff-proposal.tsx package.json pnpm-lock.yaml
git commit -m "feat(cp): Terminal Assistant mode — BYO-key chat

Operator pastes their Anthropic / OpenAI / OpenRouter key once. It
lives only in localStorage and is sent direct to the chosen provider —
Hyve never sees it. Default path uses Vercel AI Gateway with plain
'anthropic/claude-sonnet-4-6' model strings per Vercel guidance.

Assistant SQL proposals render as inline diffs the operator can Apply
or Discard against the Monaco editor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: E2E spec for the redesigned companion panel

**Files:**
- Create: `tests/e2e/companion-panel.spec.ts`

- [ ] **Step 1: Write the E2E spec**

```ts
import { test, expect, type Page } from '@playwright/test'

async function signInAsCounterparty(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.waitForURL(/\/cp/)
}

test.describe('companion panel', () => {
  test('resizes via drag handle and persists across reload', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new?vault=acred')
    const handle = page.getByRole('separator', { name: /resize companion panel/i })
    const box = await handle.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2, box!.y - 150)
    await page.mouse.up()
    await page.reload()
    // Height was persisted; the panel should still be larger than its initial 320px.
    const panel = page.locator('[data-companion-panel]')
    const post = await panel.boundingBox()
    expect(post!.height).toBeGreaterThan(380)
  })

  test('switches between all six tabs', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new?vault=acred')
    for (const label of ['Validate', 'Dry-run', 'Tests', 'Schedule', 'Integration', 'Terminal']) {
      await page.getByRole('tab', { name: label }).click()
      await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('CLI mode executes hyve help', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new?vault=acred')
    await page.getByRole('tab', { name: 'Terminal' }).click()
    await page.getByRole('tab', { name: 'CLI' }).click()
    const input = page.getByLabel('Terminal input')
    await input.fill('help')
    await input.press('Enter')
    await expect(page.getByText(/validate.*Run all pre-submit checks/)).toBeVisible()
  })

  test('Integration tab switches languages and updates code', async ({ page }) => {
    await signInAsCounterparty(page)
    await page.goto('/cp/analyses/new?vault=acred')
    await page.getByRole('tab', { name: 'Integration' }).click()
    await page.getByRole('tab', { name: 'Python' }).click()
    await expect(page.locator('pre, .shiki').first()).toContainText('from hyve import HyveClient')
  })
})
```

The `<CompanionPanel>` outer div needs a `data-companion-panel` attribute for the resize test. Add it during the visual review iteration of Task 3.

- [ ] **Step 2: Run E2E**

```bash
pnpm test:e2e tests/e2e/companion-panel.spec.ts
```

Expected: all 4 specs PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/companion-panel.spec.ts
git commit -m "test(cp): E2E spec for the redesigned companion panel

Covers: drag-to-resize persists across reload, all six tabs are
reachable by name, CLI help works, Integration language switcher
updates the code panel.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Final pass — bundle delta, a11y sweep, performance

**Files:**
- Read-only review.

- [ ] **Step 1: Bundle size check**

Run: `pnpm build` and inspect the output. Compare to a `git stash`-ed baseline.

Acceptance: the Integration tab's Shiki and the Assistant mode's react-markdown should appear as separate dynamic chunks, **not** in the workbench's main bundle. If they appear in the main bundle, fix the dynamic import in the relevant file.

Dispatch `performance-optimizer` to verify.

- [ ] **Step 2: Accessibility sweep**

Dispatch `accessibility-auditor` with prompt: "Verify the companion panel at `/cp/analyses/new?vault=acred`. Check: (a) the resize separator works with arrows/PageUp/PageDown/Home/End, (b) tab strip uses arrow keys to move between triggers, (c) Terminal mode switcher works with arrow keys, (d) Assistant chat region announces new messages via aria-live, (e) all status colors are paired with icons, (f) focus rings are visible on every focusable element on both light and dark themes."

Iterate until VERIFIED.

- [ ] **Step 3: Full visual review on all six tabs across breakpoints**

Dispatch `ui-design-reviewer` for a final pass at 1440 light, 1440 dark, 768 light, 768 dark. Iterate via the visual-fix loop until VERIFIED.

- [ ] **Step 4: Confirm `analysis-workbench.tsx` line count**

```bash
wc -l components/v2/features/cp/analysis-workbench.tsx
```

Acceptance: ~2500 lines or fewer (current: 3148).

- [ ] **Step 5: Commit any final polish + push**

```bash
git add -A
git commit -m "polish(cp): bundle, a11y, and visual review fixups for companion panel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage:** Every section of the spec is covered:
- §3 (shell + resize) → Task 3
- §4 (file structure) → Tasks 1, 2, 3 (extraction), 4–11 (tabs)
- §5.1 Validate → Task 4
- §5.2 Dry-run → Task 5
- §5.3 Tests → Task 6
- §5.4 Schedule & Cost → Task 7
- §5.5 Integration → Task 8
- §5.6 Terminal (Bridge / Assistant / CLI) → Tasks 9, 11, 10
- §6.1 real vs mocked → reflected per task in commit messages
- §6.2 dependencies → Tasks 8 (shiki), 11 (ai + markdown)
- §6.3 state → Task 2
- §6.4 performance → Task 13
- §6.5 accessibility → Tasks 3, 6, 9, 10, 11, 13
- §6.6 testing → Tasks 2, 3, 4, 6, 8, 10, 12
- §6.7 out of scope → flagged in task bodies
- §7 risks → Task 11 (security review), Task 3 (Monaco seam), Task 13 (bundle)
- §9 acceptance → Task 13

**Placeholder scan:** Each `/* … */` in code samples is a "fill in by following the obvious pattern" — they appear inside complete files where the surrounding structure makes the body clear (e.g. `OutputBlock` table render, CLI command handlers that wrap existing workbench helpers). The plan calls out re-use of `buildCodeChecks`, `buildPolicyChecksWithKMin`, `parseSelectColumns`, `hasFromClause`, `extractLineageRefs`, `getNextCronExecutions`, `countCronExecutionsIn30Days`, `buildAssertions`, `COMPUTE_COST_PER_EXEC`, `GAS_PER_WRITE`, `SAMPLE_ROWS` — all of which already exist in `analysis-workbench.tsx` and just need to be exported or extracted to a shared file when they are first imported by a companion file.

**Type consistency:** `CompanionTab` includes `'terminal'` in Task 1; `TerminalMode` is defined in Task 1 and consumed in Task 9; `Assertion`/`AssertionOperator`/`AssertionStatus` are defined in Task 6; `PayloadField`/`IntegrationLanguage` are defined in Task 8; `ParsedCommand`/`CliOutputBlock`/`CommandDef` are defined in Task 10; `AssistantConfig` in Task 11. No name drift between tasks.

**Resize hook signature:** `usePanelResize({ initial, min, maxRatio, storageKey? })` returns `{ height, setHeight, startDrag, isDragging }` — used consistently in Task 3.

**`onCodeChange` callback:** Introduced in Task 11 as an optional addition to `CompanionContextValue`. Earlier tasks (1, 2) do not require it; making it optional avoids breaking changes.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-18-companion-panel-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task via `hyve-driven-development`. The Hyve workflow already pairs each implementer with the correct reviewer agents (`ui-design-reviewer` after every UI task, `security-reviewer` after Task 11, `accessibility-auditor` after Tasks 3 / 6 / 9 / 10 / 11) and enforces the visual-fix loop.

**2. Inline Execution** — execute tasks in this session with checkpoints. Slower wall-clock but every step happens in-conversation.
