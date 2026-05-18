# Analysis workbench — companion panel redesign + Terminal

**Date:** 2026-05-18
**Author:** brainstorm with douwe@thehyve.xyz
**Predecessor:** `components/v2/features/cp/analysis-workbench.tsx` (lines 2200–2742, inline)
**Status:** approved, ready for implementation plan

---

## 1. Goal

Replace the dense, low-hierarchy bottom panel of the analysis authoring
workbench (`/cp/analyses/new`) with a VS Code-style resizable companion
panel that has six purpose-built tabs, including a new **Terminal** tab
that lets the operator "bring their own agent".

The bottom panel is the operator's verification surface — what they read
before clicking `Submit for review`. Today it is five tabs of `text-[10.5px]`
mono on `text-v2-muted` gray, packed into a 320px max-height pane that
cannot be resized. Every tab is information-dense without being
information-clear. The Integration tab in particular is three static code
blocks with no interaction.

After this redesign:

- The operator can resize the panel to fit whatever they are looking at.
- Each verification tab has the affordances appropriate to its job
  (problem-list, spreadsheet, assertion builder, timeline, payload
  contract) — no shared template forced across tabs.
- The Terminal tab supports three workflows for working with agents on
  the analysis: an external-agent bridge, a BYO-key in-browser assistant,
  and an in-browser hyve CLI.

## 2. Audience

- **Primary:** the fund operator authoring an analysis (Securitize Fund
  Services, Maple Trade Finance BD, a CLO admin). They configure once,
  verify, and submit. The companion panel is what they read during
  verification.
- **Secondary:** the operator's automated systems — an agent (Claude
  Code, Cursor, a custom bot) that connects to the workbench through
  the Terminal Bridge mode to read schema, propose SQL, and run dry-runs.

This is **not** a consumer-facing surface. The integration codegen in
the Integration tab is reference material the operator hands to their
counterparty — the counterparty never opens this UI.

## 3. Panel shell

VS Code-style resizable panel. Drag handle on the top edge resizes
height between `40px` (collapsed = tab strip only) and `min(75vh, 720px)`
(expanded). Height persists per-session in `sessionStorage` under key
`analysis-workbench:panel-height`.

Tab strip becomes six tabs in this order:

1. Validate
2. Dry-run
3. Tests
4. Schedule
5. Integration
6. Terminal

Right-aligned cluster keeps the existing chevron (full collapse to tab
strip only). The "open in side pane" affordance is **out of scope** for
this redesign — punted to a follow-up if operators ask.

Tab content is `{activeTab === 'x' && <XTab />}` — only the active tab
mounts. This means the Integration tab's lazy-loaded code highlighter
and the Terminal's chat/REPL trees never enter the DOM unless the
operator opens those tabs.

Resize gesture (`usePanelResize` hook):

- `onPointerDown` on the handle → capture pointer, set
  `body { cursor: row-resize; user-select: none }`.
- `onPointerMove` (RAF-batched) → compute height from viewport - clientY,
  clamp to `[40px, min(75vh, 720px)]`, write to state.
- `onPointerUp` → release capture, persist to `sessionStorage`.
- Keyboard a11y: handle is `tabindex=0`, `role=separator`,
  `aria-orientation=horizontal`, `aria-valuemin/max/now`. Arrow up/down
  ±24px, PageUp/Down ±100px, Home/End to min/max.
- Pointer dominance at the Monaco editor seam: handle has
  `touch-action: none` and `pointer-events: auto` so Monaco's gesture
  layer does not eat the drag.

## 4. File structure

The current bottom panel lives inline in the 3148-line
`analysis-workbench.tsx`. It comes out into its own subtree:

```
components/v2/features/cp/
├── analysis-workbench.tsx                # stays — orchestrator, ~2000 lines after extraction
└── companion/
    ├── companion-panel.tsx               # shell: resize, tab strip, lazy mount
    ├── companion-panel.types.ts          # CompanionTab, CompanionContext shared types
    ├── companion-context.tsx             # passes editor state, vault, destinations, etc.
    ├── use-panel-resize.ts               # the resize hook
    ├── validate-tab.tsx
    ├── dryrun-tab.tsx
    ├── tests-tab.tsx
    ├── schedule-tab.tsx
    ├── integration-tab.tsx
    └── terminal/
        ├── terminal-tab.tsx              # mode switcher + shared chrome
        ├── bridge-mode.tsx               # MCP/WSS UX — mocked, see §6
        ├── assistant-mode.tsx            # BYO-key chat, real, AI SDK v6 via Gateway
        ├── cli-mode.tsx                  # in-browser hyve REPL
        └── cli-commands.ts               # command parser + handlers
```

`CompanionContext` removes ~80 props currently drilled into the inline
panel. Tabs read from context, not from `analysis-workbench.tsx`'s
prop surface.

## 5. Tab designs

### 5.1 Validate

**Pattern:** flat problem-list, severity-sorted, with inline jump-to-fix actions.

- Hero row: aggregate status pill (Ready / Issues) + count + `Submit for review` button. Submit disabled when any check is `failed`.
- Below: one flat list of all checks (code + access + policy + tests + lineage + cost + destinations). Severity sort: `failed` → `warn` → `passed`.
- Each row:
  - Severity icon (paired with text — never color-only).
  - Label + one-line detail.
  - Optional right-aligned action button (`Add test →`, `Open policy →`, `Jump to line N →`). Clicking scrolls / focuses the relevant editor section or opens the relevant panel.
- Section headers are removed — flat list reads better at high density.
- Keyboard: arrow up/down navigates rows, Enter triggers the row's primary action, Space toggles row expansion when a row has more detail.

### 5.2 Dry-run

**Pattern:** spreadsheet-like preview with column-stats popovers.

- Top toolbar: snapshot timestamp (e.g. `Snapshot 2026-05-15 14:22 UTC`), row count, scan duration, `Limit [5 / 100 / 1000 ▾]` select, `↻ Re-run` button.
- Table:
  - Column headers stack three rows: `<name> (<type>)`, lineage chip (e.g. `←vault.acred.nav_calc`), and a hover/click target that opens a column-stats popover.
  - Column-stats popover: range (min–max), null count, top values, micro-sparkline.
  - Numeric cells right-aligned, `tabular-nums`, monospace.
  - Empty state when SELECT incomplete: skeleton table + "Add aliases to your SELECT columns" copy.
- Lineage chips currently buried inside cells move to the column header — cells stay clean.

### 5.3 Tests

**Pattern:** inline visual assertion builder + per-row run.

- Hero row: `<N> assertions · all run before payload signed` + `▶ Run all` button.
- Assertion list — each row is an inline-editable strip:
  - Column dropdown → operator dropdown → value input(s) → status pill (`Passed` / `Failed` / `Will run`) → ⋯ menu.
  - Operators: `not_null`, `unique`, `range`, `between`, `=`, `regex`, `freshness`.
  - Edit in place — no modal.
  - Failed assertion expands inline to show 1–3 example failing rows.
- Quick-pick chips below the list: `+ Add [not_null] [unique] [range] [regex] [fresh]` — each adds a new assertion with sensible defaults for that operator on the first eligible column.
- ⋯ menu per row: `Run only this`, `Duplicate`, `Delete`.

### 5.4 Schedule & Cost

**Pattern:** visual timeline + cost cards. Replaces the current numbered list and per-execution breakdown.

- Trigger summary row: mirrors the editor's trigger config (cron / event / manual) with an inline edit affordance — so the operator does not have to bounce up to the meta panel to fix a typo.
- Timeline strip:
  - Horizontal axis of the next 5 executions as dots on a baseline.
  - Each dot tooltips full timestamp + tz.
  - Below each dot: short label (Mon / Tue / 14:00).
  - Empty / parse-error / manual / event states render appropriate copy in this region (matches the existing four states).
- Cost cards (three across):
  - **Per execution** — total $ + sub-breakdown bars.
  - **Per day** — projection + run count.
  - **Per month** — projection + run count.
- Cost breakdown bars (below cards): compute, base gas (per chain), webhook — width = proportion of total. Pair number with bar so the visual ranks correctly when one component dominates.
- Budget cap: `[ $50 / month ▾ ]` + `Alert at 80%`. Saves to analysis config (mock persistence in this redesign — flagged with `// TODO: persist via API`). When projected monthly cost exceeds cap, the cap row shows an inline warning, and the Validate tab surfaces a `warn` row for it.

### 5.5 Integration

**Pattern:** payload contract → language switcher.

- Payload contract table at top:
  - Columns: `field`, `type`, `example`, `source`.
  - `field` and `type` derive from the editor's `SELECT … AS alias` columns.
  - `type` maps SQL types to the destination's ABI types (Solidity uint, off-chain JSON type).
  - `example` derives from `SAMPLE_ROWS` fixture or a synthesised value.
  - `source` is the lineage chip (`vault.acred.…` or `derived`).
  - `[ Copy ABI ]` button at top-right copies the ABI fragment for on-chain destinations.
- Language switcher: `[ Solidity ] [ TypeScript ] [ Python ] [ Rust ] [ curl ]` — tab strip below the contract.
- Code panel below the language switcher:
  - Auto-generated from the payload contract per language.
  - `[ Copy code ]` button.
  - Syntax highlighting via Shiki (lazy-loaded — see §6).
- Destination selector: when multiple on-chain destinations exist, a small `Destination ▾` selector switches whose ABI gets generated. Default = first on-chain destination.
- Two collapsible sections at the bottom:
  - **Sample signed payload** — the bytes a consumer would receive.
  - **Signature verification** — verify code in the same language as the switcher's current selection.
- Both collapsed by default — they are reference material, not primary path.

### 5.6 Terminal

**Pattern:** mode selector header, full pane below. Three modes: Bridge · Assistant · CLI.

Shared chrome (top of pane):

- Mode tab strip: `[ Bridge ] [ Assistant ] [ CLI ]`.
- Status row: workspace label (`hyve@<vault-slug>`), local time.
- Mode preference persists per-analysis in `sessionStorage`.

#### Bridge mode

Operator's external agent (Claude Code, Cursor, a custom bot) connects here.

- Status row: `● Connected` / `○ Idle`, agent identifier (e.g. `claude-code @ douwe.local`), key fingerprint last 8.
- Connection panel:
  - `wss://hyve.app/agent/<token>` with `[ Copy ]` and `[ Revoke ]`.
  - "How to connect" disclosure with a one-line example for `claude code mcp add`.
- Tool palette (left column inside the pane):
  - Toggleable list of tools the agent may call: `read_schema`, `propose_sql`, `dry_run`, `run_tests`, `read_destinations`.
  - Each tool has a one-line description.
- Event log (right column): streams agent tool calls with timestamps, args, and result summaries. Capped at 200 rows; older rows scroll off.
- Kill switch button (red): force-disconnects, revokes token.

**Bridge is UI-only in this redesign.** The WSS backend is Rust work and out of scope. The tab is honestly labelled `Beta` with a tooltip explaining that the bridge endpoint is not live yet. The fake event stream demonstrates the eventual UX and is gated behind a "demo" toggle so it does not lie to operators in production.

#### Assistant mode

In-browser chat with BYO API key.

- First run: provider picker (Anthropic via Vercel AI Gateway / OpenAI / OpenRouter) + key input. Key stored in `localStorage` under `hyve:assistant:key:<provider>`, never sent to Hyve backend. Inline disclosure: "Your key is stored only in this browser. Hyve cannot read it." with a `[ Remove key ]` button.
- Chat thread:
  - Constrained system prompt scoped to current analysis (vault, schema, current SQL, destinations).
  - Agent has the same tools as Bridge mode but runs in-browser against the workbench's in-memory state.
  - Markdown rendering for assistant responses (`react-markdown` + `remark-gfm`, lazy-loaded).
- Diff proposals: when the agent proposes SQL edits, the change is shown as a unified diff inline with `Apply` / `Discard` buttons. On `Apply`, the diff is written to the Monaco editor.
- Chat region uses `role=log` with `aria-live=polite` so screen readers announce new messages.

#### CLI mode

In-browser REPL.

- Prompt: `$ hyve <command>` syntax.
- Commands: `validate`, `dry-run [--limit N]`, `diff <ref>`, `sign --dry`, `tests run`, `cost`, `clear`, `help`, `history`.
- Tab completion (cycles through matches), up/down history (capped at 200 lines).
- Output uses the same formatters the other tabs use (column-stats table, problem list, cost breakdown).
- Real frontend logic, mocked backend responses that match the rest of the workbench (the entire workbench is fixtures-driven today).
- No xterm.js — custom ~80-line readline using a textarea + a pre-rendered scrollback. Keeps typography consistent with the workbench, saves ~250kb gzip.

## 6. Implementation strategy

### 6.1 Real vs mocked

| Surface | Status |
|---|---|
| Panel shell, resize, tab strip, lazy mount | Real |
| Validate tab | Real (existing `codeChecks` / `policyChecks` fixture state) |
| Dry-run column stats popover | Real (derived from `SAMPLE_ROWS` fixture) |
| Tests inline assertion builder | Real UI; state in component; persistence flagged as TODO |
| Schedule timeline + cost bars | Real (uses existing `nextExecutions`, `COMPUTE_COST_PER_EXEC`, `GAS_PER_WRITE`) |
| Integration payload contract + language codegen | Real (derived from `selectColumns` + destinations) |
| Terminal · CLI mode | Real frontend REPL, mock outputs |
| Terminal · Assistant mode | Real, AI SDK v6 via Vercel AI Gateway, BYO key in `localStorage` |
| Terminal · Bridge mode | UI mock — fake event stream gated behind demo toggle, labelled Beta |

### 6.2 Dependencies

- `ai` (AI SDK v6) — Assistant mode. Uses plain `"anthropic/claude-sonnet-4-6"` model strings through Vercel AI Gateway by default. Provider-specific packages (`@ai-sdk/anthropic`) only if the operator explicitly opts into direct provider wiring in the provider picker.
- `shiki` — Integration code highlighting. **Lazy-loaded** via dynamic `import('shiki')` inside `integration-tab.tsx` so the highlighter never enters the bundle for operators who do not open the tab.
- `react-markdown` + `remark-gfm` — Assistant chat rendering. Lazy-loaded inside `assistant-mode.tsx`.
- **No** `react-resizable-panels` — manual `usePanelResize` hook is cheaper and fits one resize axis.
- **No** `xterm.js` — custom readline.

### 6.3 State management

`CompanionContext` provider wraps the panel. Exposes:

- `editorState` (read-only snapshot: code, selectColumns, hasFrom, codeEmpty)
- `vault`, `destinations`
- `validateChecks` (derived from above)
- `dryRunResults` (state for Re-run)
- `testResults` (state for the assertion builder)
- `terminalState` (mode preference, CLI history, Assistant chat thread)

Tabs read from context. No new prop drill.

### 6.4 Performance

- Active-tab-only mount.
- RAF-batched resize updates.
- Shiki and react-markdown dynamic-imported.
- CLI history capped at 200 lines.
- Moving ~540 lines of JSX out of `analysis-workbench.tsx` improves HMR + first-mount cost in dev.

### 6.5 Accessibility (WCAG 2.2 AA — non-negotiable per `CLAUDE.md`)

- Tab strip: `role=tablist`, `aria-selected`, arrow-key navigation between triggers.
- Resize handle: `role=separator`, `aria-orientation=horizontal`, `aria-valuemin/max/now`, full keyboard support per §3.
- Assistant chat: `role=log`, `aria-live=polite`, textarea has accessible name.
- Status colors always paired with an icon — never color-only.
- All buttons have accessible names; ⋯ menus have `aria-label`.
- Focus ring matches `v2-foreground` token; never removed.

### 6.6 Testing

- **Vitest unit:** each tab in isolation with mocked `CompanionContext`. `usePanelResize` (bounds clamping, sessionStorage persistence). CLI command parser (parsing, history, completion).
- **Playwright E2E:** resize gesture (mouse + keyboard), tab switching, BYO-key flow against a mock AI Gateway endpoint, CLI command execution end-to-end.
- **Visual:** the visual-fix loop runs after every UI iteration. The Stop hook in `.claude/settings.json` enforces a Playwright screenshot before completion.
- **a11y:** `accessibility-auditor` runs after build with Playwright keyboard-only verification.

### 6.7 Out of scope (named explicitly)

- The actual Bridge WebSocket backend (Rust work).
- Persisting test assertions / budget caps to the backend (UI wired, persistence flagged with `// TODO: persist via API once endpoint exists`).
- SSE streaming for live cron-timeline updates.
- Multi-destination ABI codegen — V1 covers one destination at a time with a `Destination ▾` selector.
- "Open panel in side pane" affordance.
- Backfill controls in Schedule tab.

## 7. Risk callouts

1. **AI SDK in browser with BYO key.** `security-reviewer` will flag this surface. Mitigations: key only ever in `localStorage`; never sent to Hyve backend; CSP scoped to allow only the chosen provider's origin; UI disclosure; explicit `Remove key` button. Reviewed by `security-reviewer` before merge.
2. **Resize gesture vs Monaco editor.** Monaco eats some pointer events. The handle has `touch-action: none` and `pointer-events: auto` to dominate at the seam. Proven in the visual-fix loop before claiming done — manual drag test on both light and dark themes.
3. **Bundle size.** Shiki + react-markdown together can add ~80kb gzip. Both lazy-loaded inside their consuming tabs so the rest of the workbench does not pay the cost. `performance-optimizer` verifies bundle delta after build.
4. **Inline assertion builder state model.** The current `assertions` fixture is read-only. The redesign needs mutable client state — risk that the editor's `selectColumns` updates desync from assertion column references. Mitigation: when a referenced column disappears, the assertion's status flips to `warn` with copy "Column no longer exists" rather than erroring.

## 8. Workflow

Implementation is dispatched through `hyve-driven-development` to route
each piece to the right specialist agent with mandatory paired reviewers:

- `design-system` lands new tokens (if any) first.
- `state-management` builds `CompanionContext` and `usePanelResize`.
- `ui-component-dev` builds the shell and each tab.
- After every UI iteration: `ui-design-reviewer` takes a fresh Playwright
  screenshot. The visual-fix loop continues until verified.
- `accessibility-auditor` reviews tab strip, resize handle, chat region.
- `api-integration` builds the Assistant mode AI Gateway wiring;
  `security-reviewer` reviews BYO-key handling immediately after.
- `unit-tester` and `e2e-tester` land tests.
- `performance-optimizer` verifies bundle delta and resize jank.

## 9. Acceptance criteria

The redesign is done when:

1. The bottom panel resizes via drag (mouse) and keyboard, with state
   persisted across page reloads in the same session.
2. All six tabs render with their new patterns and pass the visual
   review on light and dark themes at 1440 and 768 widths.
3. The Integration tab generates correct codegen for all five languages
   from the current editor state.
4. The Terminal CLI executes all listed commands and renders output
   using the workbench's existing formatters.
5. The Terminal Assistant successfully completes a BYO-key chat round
   trip against Vercel AI Gateway with a real key, and can apply a
   proposed SQL diff to the Monaco editor.
6. The Terminal Bridge tab is labelled Beta and the fake event stream
   is gated behind an explicit demo toggle.
7. Lighthouse mobile + a11y scores do not regress vs `main`.
8. All Vitest specs pass; all Playwright E2E specs pass.
9. `analysis-workbench.tsx` is noticeably smaller after extraction — target ~2500 lines (current: 3148), with the entire bottom-panel JSX block lifted into `components/v2/features/cp/companion/`.
