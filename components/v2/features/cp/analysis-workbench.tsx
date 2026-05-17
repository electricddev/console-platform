'use client'

/**
 * AnalysisWorkbench — full-screen 3-col authoring UI for new analyses.
 *
 * Layout: [260px schema | 1fr editor | 320px meta] at xl:, stacks below.
 *
 * Owns all mutable state: code, name, trigger, destinations, vault selection,
 * submit-drawer open/close. Zero server-side dependencies — pure fixtures.
 */

import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-sql'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Lock,
  Plus,
  X,
  Check,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Play,
  Info,
} from 'lucide-react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import {
  analyses,
  vaults,
  type ConsumerVault,
  type VaultTable,
  type VaultField,
  type PrivacyLevel,
  type VaultTemplate,
} from '@/components/v2/features/cp/cp-fixtures'
import {
  PrivacyChip,
  PrivacyBar,
  countByPrivacy,
  PRIVACY_TONE,
  PRIVACY_LEVELS_ORDERED,
} from '@/components/v2/features/vault-detail/privacy'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ── Prism SQL highlight ───────────────────────────────────────────────────────

function highlightSQL(code: string): string {
  return Prism.highlight(code, Prism.languages['sql'] ?? Prism.languages['clike'], 'sql')
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TriggerKind = 'cron' | 'event' | 'manual'

type DestKind = 'onchain' | 'http'

type OnchainDest = {
  kind: 'onchain'
  chain: 'ETH' | 'BASE' | 'ARB' | 'OP'
  address: string
  label: string
}

type HttpDest = {
  kind: 'http'
  url: string
  label: string
}

type Destination = OnchainDest | HttpDest

type WorkbenchProps = {
  initialVaultId: string | null
  fromAnalysisId: string | null
  fromVersion: number | null
}

// ── Cron presets ──────────────────────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'every hour', expr: '0 * * * *' },
  { label: 'every 15 min', expr: '*/15 * * * *' },
  { label: 'daily 09:00 UTC', expr: '0 9 * * *' },
  { label: 'Mon-Fri 10:00 UTC', expr: '0 10 * * 1-5' },
] as const

function humanizeCron(expr: string): string {
  const map: Record<string, string> = {
    '0 * * * *': 'every hour',
    '*/15 * * * *': 'every 15 minutes',
    '0 9 * * *': 'daily at 09:00 UTC',
    '0 10 * * 1-5': 'Mon–Fri at 10:00 UTC',
    '*/30 * * * *': 'every 30 minutes',
    '0 0 * * *': 'daily at midnight UTC',
  }
  return map[expr] ?? expr
}

// ── Author-accessible vault selector ─────────────────────────────────────────

const AUTHOR_VAULTS = vaults.filter((v) => v.myAccessLevel === 'author')

// ── Existing analysis names for availability check ────────────────────────────

const EXISTING_NAMES = new Set(analyses.map((a) => a.name))

function suggestName(name: string): string {
  // Simple suffix suggestion
  const base = name.replace(/_v?\d+$/, '')
  return `${base}_v2`
}

// ── Privacy summary helper ─────────────────────────────────────────────────────

type FieldRef = {
  tableName: string
  fieldName: string
  privacy: PrivacyLevel
  /** True if the field appears inside an aggregate function call (SUM/AVG/COUNT/etc.) */
  wrappedInAggregate: boolean
  /** True if the field appears in a GROUP BY clause */
  inGroupBy: boolean
}

function parseFieldRefs(code: string, vault: ConsumerVault): FieldRef[] {
  const refs: FieldRef[] = []
  const seen = new Set<string>()

  // Pre-compute GROUP BY content (everything after GROUP BY keyword until end or ORDER BY / HAVING / LIMIT)
  const groupByMatch = /GROUP\s+BY\s+([\s\S]*?)(?:ORDER\s+BY|HAVING|LIMIT|;|$)/i.exec(code)
  const groupByClause = groupByMatch ? groupByMatch[1] : ''

  for (const tbl of vault.tables) {
    // Determine if this table is referenced in the code at all (as FROM vault.<slug>.<name>)
    const tblRefPattern = new RegExp(`vault\\.\\w+\\.${tbl.name}\\b`)
    const tblIsReferenced = tblRefPattern.test(code)

    // Match vault.<slug>.<table>.<field> qualified references
    const qualPattern = new RegExp(
      `vault\\.\\w+\\.${tbl.name}\\.([a-z_]+)`,
      'g',
    )
    let m: RegExpExecArray | null
    while ((m = qualPattern.exec(code)) !== null) {
      const fieldName = m[1]
      const field = tbl.fields.find((f) => f.name === fieldName)
      if (field && !seen.has(`${tbl.name}.${fieldName}`)) {
        seen.add(`${tbl.name}.${fieldName}`)
        const wrappedInAggregate = isWrappedInAggregate(code, m.index)
        const inGroupBy = new RegExp(`\\b${fieldName}\\b`).test(groupByClause)
        refs.push({ tableName: tbl.name, fieldName, privacy: field.privacy, wrappedInAggregate, inGroupBy })
      }
    }

    // Also match bare field names when the table is referenced in code
    if (tblIsReferenced) {
      for (const field of tbl.fields) {
        if (seen.has(`${tbl.name}.${field.name}`)) continue
        const barePattern = new RegExp(`\\b${field.name}\\b`, 'g')
        let bm: RegExpExecArray | null
        while ((bm = barePattern.exec(code)) !== null) {
          seen.add(`${tbl.name}.${field.name}`)
          const wrappedInAggregate = isWrappedInAggregate(code, bm.index)
          const inGroupBy = new RegExp(`\\b${field.name}\\b`).test(groupByClause)
          refs.push({ tableName: tbl.name, fieldName: field.name, privacy: field.privacy, wrappedInAggregate, inGroupBy })
          break
        }
      }
    }
  }

  return refs
}

/**
 * Heuristic: check if the token at `pos` in `code` is inside an aggregate
 * function call. We look backwards from `pos` for an opening paren preceded
 * by a known aggregate function name.
 */
function isWrappedInAggregate(code: string, pos: number): boolean {
  // Scan backwards from pos through nested parens to find enclosing function name
  let depth = 0
  for (let i = pos - 1; i >= 0; i--) {
    const ch = code[i]
    if (ch === ')') { depth++; continue }
    if (ch === '(') {
      if (depth === 0) {
        // Find function name before this paren
        const before = code.slice(Math.max(0, i - 20), i).trimEnd()
        if (/\b(SUM|AVG|COUNT|MIN|MAX|PERCENTILE_CONT|PERCENTILE_DISC|STDDEV|VARIANCE)\s*$/i.test(before)) {
          return true
        }
        return false
      }
      depth--
    }
  }
  return false
}

// ── Schema browser — clean room framing ──────────────────────────────────────

function SchemaPanel({
  vault,
  onInsert,
  onPrivateClick,
  currentCode,
}: {
  vault: ConsumerVault
  onInsert: (snippet: string) => void
  onPrivateClick: (fieldName: string) => void
  currentCode: string
}) {
  // Default: first table open on first load only
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (vault.tables.length > 0) s.add(vault.tables[0].name)
    return s
  })

  const toggleTable = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const isAccessible = (privacy: PrivacyLevel) => vault.accessibleOperations.includes(privacy)
  const slug = vault.id.replace(/-/g, '_')

  const handleFieldClick = (field: VaultField, tbl: VaultTable) => {
    if (field.privacy === 'private') {
      onPrivateClick(field.name)
      return
    }
    const base = `vault.${slug}.${tbl.name}.${field.name}`
    switch (field.privacy) {
      case 'select':
        onInsert(base)
        break
      case 'dimension': {
        const hasGroupBy = /\bGROUP\s+BY\b/i.test(currentCode)
        onInsert(hasGroupBy ? base : `${base} -- group by this dimension`)
        break
      }
      case 'aggregate':
        onInsert(`SUM(vault.${slug}.${tbl.name}.${field.name})`)
        break
      case 'join':
        onInsert(`-- join key: ${base}`)
        break
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-full flex-col overflow-hidden bg-v2-foreground/[0.03]">
        {/* Panel header */}
        <div className="border-b border-v2-border px-4 py-3">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted">
            Tables
          </p>
        </div>

        {/* Table list — accordion */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {vault.tables.map((tbl) => {
            const isOpen = expanded.has(tbl.name)
            return (
              <div key={tbl.name}>
                {/* Table row header */}
                <button
                  type="button"
                  onClick={() => toggleTable(tbl.name)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} table ${tbl.name}`}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-2.5 text-left transition-colors hover:bg-v2-foreground/[0.04]"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-v2-muted/50" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-v2-muted/50" strokeWidth={2} />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-v2-foreground">
                    {tbl.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-v2-muted">
                    {tbl.fields.length} cols
                  </span>
                </button>

                {/* Expanded: fields + lineage */}
                {isOpen && (
                  <div className="ml-2 border-l border-v2-border/30 pl-2 pb-1 mt-1">
                    {tbl.fields.map((field) => {
                      const accessible = isAccessible(field.privacy)
                      const isPrivate = field.privacy === 'private'
                      return (
                        <Tooltip key={field.name}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleFieldClick(field, tbl)}
                              className={cn(
                                'flex w-full items-center gap-1.5 rounded px-1.5 py-2 text-left transition-colors',
                                isPrivate
                                  ? 'cursor-not-allowed opacity-50'
                                  : accessible
                                    ? 'hover:bg-v2-foreground/[0.04]'
                                    : 'cursor-not-allowed opacity-50',
                              )}
                              aria-disabled={isPrivate || !accessible}
                            >
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate font-mono text-[13px]',
                                  accessible && !isPrivate ? 'text-v2-foreground' : 'text-v2-muted/50',
                                )}
                              >
                                {field.name}
                              </span>
                              {field.kMin !== undefined && (
                                <span className="shrink-0 rounded bg-v2-foreground/[0.06] px-1.5 py-px font-mono text-[10.5px] text-v2-muted">
                                  min k={field.kMin}
                                </span>
                              )}
                              <PrivacyChip level={field.privacy} size="sm" mode="operation" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="max-w-[280px]">
                            <div className="flex flex-col gap-1 py-0.5">
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-[12px] font-medium">{field.name}</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-60">
                                  {field.type}
                                </span>
                              </div>
                              <p className="text-[11.5px] leading-snug opacity-90">
                                {field.description}
                              </p>
                              {field.kMin !== undefined && (
                                <p className="text-[10.5px] leading-snug opacity-60">
                                  Aggregates must include at least {field.kMin} distinct identifiers.
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-v2-border px-4 py-3">
          <p className="font-mono text-[11.5px] text-v2-muted leading-snug">
            Tap a column to insert.
          </p>
          <p className="font-mono text-[11.5px] text-v2-muted leading-snug">
            Operations limited to your access grant.
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ── Template popover ──────────────────────────────────────────────────────────

function TemplatePopover({
  templates,
  currentCode,
  onInsert,
}: {
  templates: VaultTemplate[]
  currentCode: string
  onInsert: (snippet: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const hasContent = currentCode
    .split('\n')
    .some((line) => line.trim().length > 0 && !line.trim().startsWith('--'))

  const handleSelect = (tmpl: VaultTemplate) => {
    if (hasContent) {
      setConfirmId(tmpl.id)
    } else {
      onInsert(tmpl.code)
      setOpen(false)
    }
  }

  const confirmReplace = (tmpl: VaultTemplate) => {
    onInsert(tmpl.code)
    setOpen(false)
    setConfirmId(null)
  }

  if (templates.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setConfirmId(null) }}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${templates.length} provider-approved patterns`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors',
          open
            ? 'border-v2-border bg-v2-foreground/[0.07] text-v2-foreground'
            : 'border-v2-border/50 text-v2-muted/60 hover:border-v2-border hover:text-v2-muted',
        )}
      >
        Start from template
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} strokeWidth={2} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => { setOpen(false); setConfirmId(null) }}
            aria-hidden="true"
          />
          {/* Popover */}
          <div
            role="menu"
            className="absolute left-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-v2-border/60 bg-v2-surface shadow-lg overflow-hidden"
          >
            {templates.map((tmpl) => {
              const isConfirming = confirmId === tmpl.id
              return (
                <div key={tmpl.id} className="border-b border-v2-border/30 last:border-b-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span className="flex-1 font-mono text-[10px] text-v2-muted/70">
                        Replace current code?
                      </span>
                      <button
                        type="button"
                        onClick={() => confirmReplace(tmpl)}
                        className="rounded bg-v2-foreground px-2 py-0.5 font-mono text-[9.5px] text-v2-surface"
                      >
                        Insert
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded border border-v2-border/50 px-2 py-0.5 font-mono text-[9.5px] text-v2-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      title={tmpl.description}
                      onClick={() => handleSelect(tmpl)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-v2-foreground/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block font-mono text-[11px] text-v2-foreground">
                          {tmpl.name}
                        </span>
                        <span className="block text-[10px] text-v2-muted/60 leading-snug mt-0.5">
                          {tmpl.description}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-muted/30" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Code editor with line numbers ────────────────────────────────────────────

function CodeEditorPanel({
  code,
  onChange,
}: {
  code: string
  onChange: (code: string) => void
}) {
  const lineCount = code.split('\n').length

  // Font-size and line-height MUST match between the gutter <pre> and the
  // editor <textarea>, otherwise lines progressively drift and clicks land
  // on the wrong line. Use absolute pixel line-height to avoid multiplier
  // rounding mismatches.
  const FONT_SIZE_PX = 11.5
  const LINE_HEIGHT_PX = 19
  const PADDING_PX = 16

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      {/* Line numbers gutter — flex column so the border extends to full height */}
      <div
        aria-hidden="true"
        className="flex shrink-0 flex-col select-none border-r border-v2-border/30 text-right"
        style={{ minWidth: '3rem', paddingLeft: PADDING_PX, paddingRight: 12 }}
      >
        <pre
          className="m-0 font-mono text-v2-muted/40"
          style={{
            fontSize: `${FONT_SIZE_PX}px`,
            lineHeight: `${LINE_HEIGHT_PX}px`,
            paddingTop: PADDING_PX,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </pre>
        {/* Spacer keeps the gutter background + right border running to the
            bottom of the editor area even when content is short. */}
        <div className="flex-1" />
      </div>

      {/* Editor — `padding` MUST be passed via the prop so it lands on both
          the textarea AND the highlighted <pre>. Setting padding via the
          root `style` only offsets the pre (the textarea is absolutely
          positioned inside the root), which causes a one-line cursor drift. */}
      <div className="flex-1 overflow-auto">
        <Editor
          value={code}
          onValueChange={onChange}
          highlight={highlightSQL}
          tabSize={2}
          insertSpaces
          padding={PADDING_PX}
          className="code-editor-root min-h-full"
          textareaClassName="code-editor-textarea outline-none"
          preClassName="code-editor-pre"
          style={{
            fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
            fontSize: `${FONT_SIZE_PX}px`,
            lineHeight: `${LINE_HEIGHT_PX}px`,
            minHeight: '100%',
            background: 'transparent',
            color: 'var(--v2-foreground)',
          }}
        />
      </div>
    </div>
  )
}

// ── Destination editor (inline, no modal) ─────────────────────────────────────

type AddDestFormProps = {
  onSave: (dest: Destination) => void
  onCancel: () => void
}

function AddDestForm({ onSave, onCancel }: AddDestFormProps) {
  const [kind, setKind] = useState<DestKind>('onchain')
  const [chain, setChain] = useState<OnchainDest['chain']>('ETH')
  const [address, setAddress] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  const addressError =
    kind === 'onchain' && address.length > 0
      ? !address.startsWith('0x') || address.length !== 42
        ? 'Must be 0x-prefixed 42-char address'
        : null
      : null

  const canSave =
    kind === 'http'
      ? url.length > 8
      : address.startsWith('0x') && address.length === 42

  const save = () => {
    if (!canSave) return
    if (kind === 'onchain') {
      onSave({ kind: 'onchain', chain, address, label })
    } else {
      onSave({ kind: 'http', url, label })
    }
  }

  return (
    <div className="rounded-lg border border-v2-border/60 bg-v2-surface-2/40 p-3 space-y-3">
      {/* Kind toggle */}
      <div className="flex items-center gap-2">
        {(['onchain', 'http'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded px-2.5 py-1 font-mono text-[11px] transition-colors',
              kind === k
                ? 'bg-v2-foreground text-v2-surface'
                : 'bg-v2-foreground/[0.06] text-v2-muted hover:bg-v2-foreground/[0.1] hover:text-v2-foreground',
            )}
          >
            {k === 'onchain' ? 'On-chain' : 'HTTP'}
          </button>
        ))}
      </div>

      {kind === 'onchain' ? (
        <div className="space-y-2">
          {/* Chain selector */}
          <div className="flex gap-1.5">
            {(['ETH', 'BASE', 'ARB', 'OP'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChain(c)}
                className={cn(
                  'rounded px-2 py-0.5 font-mono text-[10px] transition-colors',
                  chain === c
                    ? 'bg-v2-foreground text-v2-surface'
                    : 'bg-v2-foreground/[0.06] text-v2-muted hover:text-v2-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Address */}
          <div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 font-mono text-[11.5px] text-v2-foreground placeholder:text-v2-muted/40 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20"
            />
            {addressError && (
              <p className="mt-1 font-mono text-[10px] text-v2-warning">{addressError}</p>
            )}
          </div>
        </div>
      ) : (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 font-mono text-[11.5px] text-v2-foreground placeholder:text-v2-muted/40 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20"
        />
      )}

      {/* Label */}
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        className="w-full rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[11.5px] text-v2-foreground placeholder:text-v2-muted/40 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-md bg-v2-foreground px-3 py-1.5 font-mono text-[11px] text-v2-surface disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border/60 px-3 py-1.5 font-mono text-[11px] text-v2-muted transition-colors hover:text-v2-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Submit drawer ─────────────────────────────────────────────────────────────

type SubmitDrawerProps = {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  analysisName: string
  vault: ConsumerVault
  version: number
  triggerKind: TriggerKind
  cronExpr: string
  eventSource: string
  destinations: Destination[]
  code: string
  fieldRefs: FieldRef[]
  hasViolations: boolean
}

function SubmitDrawer({
  open,
  onClose,
  onSubmit,
  analysisName,
  vault,
  version,
  triggerKind,
  cronExpr,
  eventSource,
  destinations,
  code,
  fieldRefs,
  hasViolations,
}: SubmitDrawerProps) {
  const [note, setNote] = useState('')

  const canSubmit =
    analysisName.trim().length > 0 &&
    !EXISTING_NAMES.has(analysisName) &&
    destinations.length > 0 &&
    !hasViolations

  const triggerSummary =
    triggerKind === 'cron'
      ? `Cron: ${humanizeCron(cronExpr)}`
      : triggerKind === 'event'
        ? `Event: ${eventSource}`
        : 'Manual'

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-v2-background/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Submit proposal to ${vault.provider.name}`}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-v2-border/60 bg-v2-surface shadow-2xl transition-transform duration-300',
          'sm:w-[520px]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-start justify-between border-b border-v2-border/40 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-v2-foreground">
              Submit proposal to {vault.provider.name}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-v2-muted">{vault.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-md p-1.5 text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Summary */}
          <section className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
              Summary
            </h3>
            <Surface padding="sm" radius="xl">
              <dl className="space-y-1.5">
                <Row label="Name">
                  <span className="font-mono text-[12px] text-v2-foreground">{analysisName || '—'}</span>
                </Row>
                <Row label="Version">
                  <span className="font-mono text-[12px] text-v2-foreground">v{version}</span>
                </Row>
                <Row label="Trigger">
                  <span className="text-[12px] text-v2-foreground">{triggerSummary}</span>
                </Row>
                <Row label="Destinations">
                  <span className="text-[12px] text-v2-foreground">
                    {destinations.length === 0 ? (
                      <span className="text-v2-warning">none configured</span>
                    ) : (
                      `${destinations.length} destination${destinations.length > 1 ? 's' : ''}`
                    )}
                  </span>
                </Row>
              </dl>
            </Surface>
          </section>

          {/* 2. What provider sees */}
          <section className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
              What {vault.provider.name} sees
            </h3>
            <Surface padding="none" radius="xl" className="overflow-hidden">
              <pre className="overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-v2-muted/80 whitespace-pre">
                {code || '-- (no code yet)'}
              </pre>
            </Surface>
            {fieldRefs.length > 0 && (
              <div className="space-y-1">
                <p className="font-mono text-[10.5px] text-v2-muted/60">Fields referenced:</p>
                <div className="flex flex-wrap gap-1.5">
                  {fieldRefs.map((r) => (
                    <span
                      key={`${r.tableName}.${r.fieldName}`}
                      className="rounded bg-v2-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-v2-muted"
                    >
                      {r.tableName}.{r.fieldName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {destinations.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="font-mono text-[10.5px] text-v2-muted/60">Destinations:</p>
                {destinations.map((d, i) => (
                  <p key={i} className="font-mono text-[10.5px] text-v2-muted">
                    {d.kind === 'onchain' ? `${d.chain}: ${d.address}` : d.url}
                    {d.label ? ` (${d.label})` : ''}
                  </p>
                ))}
              </div>
            )}
          </section>

          {/* 3. Privacy guarantee */}
          <section className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
              Privacy guarantee
            </h3>
            <p className="text-[12px] leading-relaxed text-v2-muted">
              The provider sees the shape of your access — the code, the fields, the
              destinations. They do not see execution results. Approved computations
              run inside an isolated environment; only the signed output leaves the vault.
            </p>
          </section>

          {/* 4. Note to reviewer */}
          <section className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
              Note to reviewer <span className="normal-case">(optional)</span>
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`e.g. "v${version} raises advance rate cap to 0.85 per updated credit policy"`}
              rows={3}
              className="w-full rounded-lg border border-v2-border/60 bg-v2-surface px-3 py-2.5 text-[12.5px] text-v2-foreground placeholder:text-v2-muted/40 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20 resize-none"
            />
          </section>

          {/* Validation messages */}
          {!canSubmit && (
            <div className="rounded-lg border border-v2-border/60 bg-v2-foreground/[0.03] px-4 py-3 space-y-1">
              {!analysisName.trim() && (
                <p className="font-mono text-[11px] text-v2-muted">
                  · Analysis name is required
                </p>
              )}
              {EXISTING_NAMES.has(analysisName) && (
                <p className="font-mono text-[11px] text-v2-muted">
                  · Name is taken — choose a different name
                </p>
              )}
              {destinations.length === 0 && (
                <p className="font-mono text-[11px] text-v2-muted">
                  · At least one destination is required
                </p>
              )}
              {hasViolations && (
                <p className="font-mono text-[11px] text-v2-muted">
                  · Private fields are referenced — remove them before submitting
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="flex items-center justify-between border-t border-v2-border/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-v2-border/60 px-4 py-2 text-[13px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-v2-foreground px-5 py-2 text-[13px] font-medium text-v2-surface transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
          >
            Submit proposal
          </button>
        </div>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.06em] text-v2-muted/60 pt-0.5">
        {label}
      </dt>
      <dd className="flex-1">{children}</dd>
    </div>
  )
}

// ── Vault picker dialog ───────────────────────────────────────────────────────

type VaultPickerProps = {
  open: boolean
  onSelect: (vaultId: string) => void
  onCancel: () => void
}

function VaultPicker({ open, onSelect, onCancel }: VaultPickerProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-v2-background/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a vault to author against"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-v2-border/60 bg-v2-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-v2-border/40 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-v2-foreground">
            Choose a vault to author against
          </h2>
          <p className="mt-0.5 text-[12.5px] text-v2-muted">
            Only vaults where you have author access are shown.
          </p>
        </div>

        <div className="divide-y divide-v2-border/40 px-2 py-2">
          {AUTHOR_VAULTS.map((vault) => (
            <button
              key={vault.id}
              type="button"
              onClick={() => onSelect(vault.id)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-v2-foreground/[0.04]"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[13px] font-semibold text-v2-foreground">
                  {vault.name}
                </p>
                <p className="mt-0.5 text-[12px] text-v2-muted truncate">{vault.label}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-v2-muted/50">
                  {vault.provider.name} · {vault.tables.length} tables · {vault.myAnalysisCount} analyses authored
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-v2-muted/40" strokeWidth={1.75} />
            </button>
          ))}
        </div>

        <div className="border-t border-v2-border/40 px-6 py-3">
          <Link
            href="/cp/analyses"
            onClick={onCancel}
            className="text-[12.5px] text-v2-muted transition-colors hover:text-v2-foreground"
          >
            Cancel — back to Analyses
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Companion panel helpers ───────────────────────────────────────────────────

type CompanionTab = 'policy' | 'dryrun' | 'integration' | 'lineage'

/**
 * Attempt to extract SELECT-list aliases + their underlying expressions from
 * the SQL code. Best-effort regex; not a full SQL parser.
 *
 * Returns an array of { alias, expression } objects for each AS-aliased item
 * in the top-level SELECT list. Also returns bare column references with no
 * alias if they are simple `table.field` or `field` forms.
 */
type SelectColumn = {
  alias: string
  expression: string
  /** Inferred SQL type from vault schema, or null if unknown */
  type: string | null
  /** Source reference string, e.g. `nav_latest.current_nav` */
  source: string
}

/**
 * Locate the body (between SELECT and FROM) of the LAST top-level SELECT
 * statement at paren-depth 0. CTE inner SELECTs are nested in parens and
 * therefore skipped. Returns null if no top-level SELECT is found.
 */
function extractFinalSelectBody(stripped: string): string | null {
  const upper = stripped.toUpperCase()
  let depth = 0
  const selectEnds: number[] = []
  const fromStarts: number[] = []
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i]
    if (ch === '(') {
      depth++
      continue
    }
    if (ch === ')') {
      depth--
      continue
    }
    if (depth !== 0) continue
    // Boundary-checked SELECT
    if (
      upper.substr(i, 6) === 'SELECT' &&
      (i === 0 || /\W/.test(stripped[i - 1]!)) &&
      /\W|$/.test(stripped[i + 6] ?? '')
    ) {
      selectEnds.push(i + 6)
      i += 5
      continue
    }
    // Boundary-checked FROM
    if (
      upper.substr(i, 4) === 'FROM' &&
      (i === 0 || /\W/.test(stripped[i - 1]!)) &&
      /\W|$/.test(stripped[i + 4] ?? '')
    ) {
      fromStarts.push(i)
      i += 3
    }
  }
  if (selectEnds.length === 0) return null
  const lastSelectEnd = selectEnds[selectEnds.length - 1]!
  const nextFrom = fromStarts.find((idx) => idx > lastSelectEnd)
  const end = nextFrom ?? stripped.length
  return stripped.substring(lastSelectEnd, end).trim()
}

function parseSelectColumns(code: string, vault: ConsumerVault | null): SelectColumn[] {
  if (!vault) return []

  // Strip comments
  const stripped = code.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

  // Find the FINAL SELECT statement at paren-depth 0. For CTE'd queries
  // (WITH x AS (SELECT ...), y AS (SELECT ...) SELECT ...) the inner SELECTs
  // are nested in parens; only the outer SELECT lives at depth 0.
  const selectBody = extractFinalSelectBody(stripped)
  if (!selectBody || selectBody === '*') return []

  // Build a field type lookup from vault
  const fieldTypes = new Map<string, string>()
  for (const tbl of vault.tables) {
    for (const f of tbl.fields) {
      fieldTypes.set(f.name, f.type)
      fieldTypes.set(`${tbl.name}.${f.name}`, f.type)
      fieldTypes.set(`vault.${vault.id.replace(/-/g, '_')}.${tbl.name}.${f.name}`, f.type)
    }
  }

  // Split on commas that are NOT inside parens
  const items: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of selectBody) {
    if (ch === '(') { depth++; cur += ch }
    else if (ch === ')') { depth--; cur += ch }
    else if (ch === ',' && depth === 0) { items.push(cur.trim()); cur = '' }
    else cur += ch
  }
  if (cur.trim()) items.push(cur.trim())

  const results: SelectColumn[] = []
  for (const item of items) {
    if (!item) continue

    // Match `expr AS alias`
    const asMatch = /^([\s\S]+?)\s+AS\s+([a-z_][a-z0-9_]*)$/i.exec(item.trim())
    if (asMatch) {
      const expr = asMatch[1].trim()
      const alias = asMatch[2].trim()

      // Try to infer type
      let inferredType: string | null = null
      let source = expr

      // Aggregate wrapping
      const aggMatch = /^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*([\s\S]+?)\s*\)\s*$/i.exec(expr)
      if (aggMatch) {
        const innerField = aggMatch[2].split('.').pop() ?? ''
        const baseType = fieldTypes.get(innerField) ?? fieldTypes.get(aggMatch[2]) ?? null
        inferredType = aggMatch[1].toUpperCase() === 'COUNT' ? 'NUMERIC' : (baseType ?? 'NUMERIC')
        source = `${aggMatch[1].toUpperCase()}(${aggMatch[2]})`
      } else {
        // Simple field reference
        const fieldName = expr.split('.').pop() ?? ''
        inferredType = fieldTypes.get(fieldName) ?? fieldTypes.get(expr) ?? null
        // Shorten the source to table.field form
        const parts = expr.split('.')
        source = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : expr
      }

      results.push({ alias, expression: expr, type: inferredType, source })
    } else {
      // No alias — bare column ref
      const fieldName = item.split('.').pop() ?? item
      const inferredType = fieldTypes.get(fieldName) ?? fieldTypes.get(item) ?? null
      const parts = item.split('.')
      const source = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : item
      results.push({ alias: fieldName, expression: item, type: inferredType, source })
    }
  }

  return results
}

/** Check if SQL has a FROM clause */
function hasFromClause(code: string): boolean {
  return /\bFROM\b/i.test(code.replace(/--[^\n]*/g, ''))
}

// ── Policy check types ────────────────────────────────────────────────────────

type PolicyCheckStatus = 'pass' | 'fail' | 'warn' | 'info'

type PolicyCheck = {
  id: string
  status: PolicyCheckStatus
  verb: string
  detail: string
}

function buildPolicyChecks({
  fieldRefs,
  destinations,
  name,
  code,
}: {
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
  code: string
}): PolicyCheck[] {
  const checks: PolicyCheck[] = []

  // 1. Access grant
  const privateRefs = fieldRefs.filter((r) => r.privacy === 'private')
  const accessibleRefs = fieldRefs.filter((r) => r.privacy !== 'private')
  if (privateRefs.length === 0) {
    checks.push({
      id: 'access-grant',
      status: 'pass',
      verb: 'Access grant',
      detail:
        accessibleRefs.length === 0
          ? 'No vault fields referenced yet'
          : `${accessibleRefs.length} field${accessibleRefs.length !== 1 ? 's' : ''} within your access grant`,
    })
  } else {
    checks.push({
      id: 'access-grant',
      status: 'fail',
      verb: 'Access grant',
      detail: `${privateRefs.length} private field${privateRefs.length !== 1 ? 's' : ''} referenced — ${privateRefs.map((r) => r.fieldName).join(', ')} (blocked at ingest)`,
    })
  }

  // 2. Aggregate wrapping
  const aggregateRaw = fieldRefs.filter(
    (r) => r.privacy === 'aggregate' && !r.wrappedInAggregate,
  )
  const aggregateWrapped = fieldRefs.filter(
    (r) => r.privacy === 'aggregate' && r.wrappedInAggregate,
  )
  if (aggregateRaw.length === 0) {
    if (aggregateWrapped.length > 0) {
      checks.push({
        id: 'aggregate-wrap',
        status: 'pass',
        verb: 'Aggregate wrapping',
        detail: `Aggregable field${aggregateWrapped.length !== 1 ? 's' : ''} wrapped: ${aggregateWrapped.map((r) => r.fieldName).join(', ')}`,
      })
    } else if (fieldRefs.some((r) => r.privacy === 'aggregate')) {
      // Shouldn't happen, but catch-all
      checks.push({
        id: 'aggregate-wrap',
        status: 'pass',
        verb: 'Aggregate wrapping',
        detail: 'All aggregate fields correctly wrapped',
      })
    }
    // If no aggregate fields at all, skip this check
  } else {
    checks.push({
      id: 'aggregate-wrap',
      status: 'fail',
      verb: 'Aggregate wrapping',
      detail: `${aggregateRaw.length} aggregable field${aggregateRaw.length !== 1 ? 's' : ''} used raw — ${aggregateRaw.map((r) => r.fieldName).join(', ')} must be wrapped in SUM/AVG/COUNT/MIN/MAX`,
    })
  }

  // 3. Join-key usage
  const joinRefsInSelect = fieldRefs.filter(
    (r) => r.privacy === 'join' && !r.inGroupBy && !r.wrappedInAggregate,
  )
  const joinRefsAsKey = fieldRefs.filter(
    (r) => r.privacy === 'join' && (r.inGroupBy || r.wrappedInAggregate),
  )
  if (joinRefsInSelect.length === 0) {
    if (fieldRefs.some((r) => r.privacy === 'join')) {
      checks.push({
        id: 'join-key',
        status: 'pass',
        verb: 'Join-key usage',
        detail: 'Join fields used as match keys',
      })
    }
    // No join fields → skip
  } else {
    checks.push({
      id: 'join-key',
      status: 'warn',
      verb: 'Join-key usage',
      detail: `${joinRefsInSelect.length} join field${joinRefsInSelect.length !== 1 ? 's' : ''} appear${joinRefsInSelect.length === 1 ? 's' : ''} in SELECT — ${joinRefsInSelect.map((r) => r.fieldName).join(', ')} ${joinRefsInSelect.length === 1 ? 'is' : 'are'} match key${joinRefsInSelect.length !== 1 ? 's' : ''} and won't be returned`,
    })
  }
  // Suppress join-key row if no join fields at all

  // 4. k-min constraints
  const kMinRefs = fieldRefs.filter(
    (r) => r.privacy === 'aggregate' && r.wrappedInAggregate,
  )
  // We need kMin from the vault — look it up
  // (We don't have vault here, so we accept it being passed)
  // This is handled in the calling component which has vault access

  // 5. Destinations
  if (destinations.length >= 1) {
    checks.push({
      id: 'destinations',
      status: 'pass',
      verb: 'Destination',
      detail: `${destinations.length} destination${destinations.length !== 1 ? 's' : ''} configured`,
    })
  } else {
    checks.push({
      id: 'destinations',
      status: 'fail',
      verb: 'Destination',
      detail: 'No destination configured — add at least one in the meta panel before submitting',
    })
  }

  // 6. Name
  const trimmedName = name.trim()
  if (!trimmedName) {
    checks.push({
      id: 'name',
      status: 'fail',
      verb: 'Name',
      detail: 'Name is empty',
    })
  } else if (EXISTING_NAMES.has(trimmedName)) {
    checks.push({
      id: 'name',
      status: 'fail',
      verb: 'Name',
      detail: `Name taken — try ${suggestName(trimmedName)}`,
    })
  } else {
    checks.push({
      id: 'name',
      status: 'pass',
      verb: 'Name',
      detail: `Name available — ${trimmedName}`,
    })
  }

  return checks
}

function buildPolicyChecksWithKMin({
  fieldRefs,
  destinations,
  name,
  vault,
}: {
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
  vault: ConsumerVault | null
}): PolicyCheck[] {
  const base = buildPolicyChecks({ fieldRefs, destinations, name, code: '' })

  if (!vault) return base

  // Insert k-min info rows after aggregate wrap check
  const kMinChecks: PolicyCheck[] = []
  for (const tbl of vault.tables) {
    for (const field of tbl.fields) {
      if (field.kMin !== undefined) {
        const ref = fieldRefs.find(
          (r) => r.fieldName === field.name && r.tableName === tbl.name,
        )
        if (ref?.wrappedInAggregate) {
          kMinChecks.push({
            id: `kmin-${field.name}`,
            status: 'info',
            verb: 'k-min',
            detail: `${field.name} · min k=${field.kMin} enforced at execution time`,
          })
        }
      }
    }
  }

  // Insert k-min checks after the aggregate-wrap check
  const aggIdx = base.findIndex((c) => c.id === 'aggregate-wrap')
  if (aggIdx >= 0 && kMinChecks.length > 0) {
    base.splice(aggIdx + 1, 0, ...kMinChecks)
  }

  return base
}

// ── Companion panel ───────────────────────────────────────────────────────────

type CompanionPanelProps = {
  open: boolean
  onToggle: () => void
  activeTab: CompanionTab
  onTabChange: (t: CompanionTab) => void
  code: string
  vault: ConsumerVault | null
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
}

/** Status icon for a policy check row */
function PolicyIcon({ status }: { status: PolicyCheckStatus }) {
  if (status === 'pass')
    return <Check className="mt-px h-3.5 w-3.5 shrink-0 text-v2-success" strokeWidth={2.25} />
  if (status === 'fail')
    return <X className="mt-px h-3.5 w-3.5 shrink-0 text-v2-danger" strokeWidth={2.25} />
  if (status === 'warn')
    return <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-v2-warning" strokeWidth={2} />
  return <Info className="mt-px h-3.5 w-3.5 shrink-0 text-v2-muted/50" strokeWidth={2} />
}

/** Small copy-to-clipboard button. Wires navigator.clipboard when available. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // silently ignore in environments without clipboard access
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-v2-muted/60 transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-v2-success" strokeWidth={2} />
      ) : (
        <Copy className="h-3 w-3" strokeWidth={1.75} />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Fixture sample rows (ACRED canonical) ─────────────────────────────────────

const SAMPLE_ROWS: Record<string, string>[] = [
  { advance_rate: '0.85', nav_usd: '425,371,892.54', eligible_par: '478,231,015.22', as_of: '2026-05-15T14:22:18Z' },
  { advance_rate: '0.84', nav_usd: '419,205,119.18', eligible_par: '482,007,283.61', as_of: '2026-05-15T14:21:14Z' },
]

/** Numeric-looking values should be right-aligned */
function isNumericValue(v: string): boolean {
  return /^[\d,.\-+e]+$/.test(v.trim())
}

function CompanionPanel({
  open,
  onToggle,
  activeTab,
  onTabChange,
  code,
  vault,
  fieldRefs,
  destinations,
  name,
}: CompanionPanelProps) {
  const checks = buildPolicyChecksWithKMin({ fieldRefs, destinations, name, vault })
  const failCount = checks.filter((c) => c.status === 'fail').length

  const selectColumns = parseSelectColumns(code, vault)
  const hasFrom = hasFromClause(code)
  const codeEmpty = code.trim().length === 0 || !hasFrom

  // First on-chain destination for Integration tab
  const firstOnchain = destinations.find((d): d is OnchainDest => d.kind === 'onchain') ?? null
  const onchainCount = destinations.filter((d) => d.kind === 'onchain').length

  const analysisSlug = name.trim() || 'analysis_name'
  const onchainAddr = firstOnchain ? firstOnchain.address : '0x0000000000000000000000000000000000000000'
  const onchainAddrShort = firstOnchain
    ? `${firstOnchain.address.slice(0, 6)}...${firstOnchain.address.slice(-4)}`
    : '0x0000...0000'
  const onchainLabel = firstOnchain?.label ?? 'Oracle'

  const solidityCode = `// Read the signed payload from your Hyve oracle.
// Destination: ${firstOnchain?.chain?.toUpperCase() ?? 'ETH'} ${onchainAddrShort} (${onchainLabel})
interface IHyveOracle {
    function read(string calldata analysis) external view returns (bytes memory payload, uint64 asOf, bytes memory signature);
}

contract YourVault {
    IHyveOracle constant ORACLE = IHyveOracle(${onchainAddr});

    function getAdvanceRate() external view returns (uint256 advanceRate) {
        (bytes memory payload, uint64 asOf, bytes memory sig) = ORACLE.read("${analysisSlug}");
        require(block.timestamp - asOf < 1 hours, "stale");
        // payload decodes to your output schema
        (advanceRate, , , ) = abi.decode(payload, (uint256, uint256, uint256, uint64));
    }
}`

  const tsCode = `import { HyveClient } from '@hyve/client'

const client = new HyveClient({ orgId: 'org_gauntlet' })

// Read with signature verification.
const result = await client.read('${analysisSlug}', { verify: true })

${selectColumns.length > 0
    ? selectColumns.map((c) => `console.log(result.${c.alias})`).join('\n')
    : `console.log(result.advance_rate)   // 0.85
console.log(result.as_of)           // 2026-05-15T14:22:18.413Z`}
console.log(result.signature)       // 0x...`

  const providerName = vault?.provider.name ?? 'Apollo Asset Mgmt'
  const sigKey = '0xa3b1…f04c'

  // Determine if we can show sample rows: code has FROM and at least one column
  const canShowDryRun = hasFrom && !codeEmpty

  // Handle tab click — if panel closed, open it too
  const handleTabTriggerClick = (tab: CompanionTab) => {
    onTabChange(tab)
    if (!open) {
      // Panel will open because parent sets open=true on tab click
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col border-t border-v2-border/60 transition-[height] duration-200',
        open ? 'h-[min(40vh,320px)]' : 'h-auto',
      )}
      style={open ? { height: 'min(40vh, 320px)' } : undefined}
    >
      {/* Tab strip */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          onTabChange(v as CompanionTab)
          if (!open) onToggle()
        }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center border-b border-v2-border/40 bg-v2-foreground/[0.02]">
          <TabsList
            variant="line"
            className="h-9 flex-1 w-full justify-start gap-0 rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              value="policy"
              className={cn(
                'relative h-9 rounded-none px-3 font-mono text-[11px] tracking-[0.04em] text-v2-muted/70 data-[state=active]:text-v2-foreground',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-v2-foreground after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
                'hover:text-v2-foreground',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              )}
              onClick={() => handleTabTriggerClick('policy')}
            >
              Policy
              {failCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-v2-warning/20 px-1 font-mono text-[9px] text-v2-warning">
                  {failCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="dryrun"
              className={cn(
                'relative h-9 rounded-none px-3 font-mono text-[11px] tracking-[0.04em] text-v2-muted/70 data-[state=active]:text-v2-foreground',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-v2-foreground after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
                'hover:text-v2-foreground',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              )}
              onClick={() => handleTabTriggerClick('dryrun')}
            >
              Dry-run
            </TabsTrigger>
            <TabsTrigger
              value="integration"
              className={cn(
                'relative h-9 rounded-none px-3 font-mono text-[11px] tracking-[0.04em] text-v2-muted/70 data-[state=active]:text-v2-foreground',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-v2-foreground after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
                'hover:text-v2-foreground',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              )}
              onClick={() => handleTabTriggerClick('integration')}
            >
              Integration
            </TabsTrigger>
            <TabsTrigger
              value="lineage"
              className={cn(
                'relative h-9 rounded-none px-3 font-mono text-[11px] tracking-[0.04em] text-v2-muted/70 data-[state=active]:text-v2-foreground',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-v2-foreground after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
                'hover:text-v2-foreground',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              )}
              onClick={() => handleTabTriggerClick('lineage')}
            >
              Lineage
            </TabsTrigger>
          </TabsList>

          {/* Chevron toggle */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Collapse companion panel' : 'Expand companion panel'}
            className="mr-2 flex h-7 w-7 items-center justify-center rounded text-v2-muted/50 transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>
        </div>

        {/* Content — only rendered when open */}
        {open && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* ── Policy tab ── */}
            <TabsContent value="policy" className="m-0 h-full">
              <div className="px-4 py-3 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  {failCount === 0 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
                      <span className="font-mono text-[11px] text-v2-success">Ready to submit</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-v2-warning" />
                      <span className="font-mono text-[11px] text-v2-warning">{failCount} issue{failCount !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>

                {/* Check rows */}
                <div className="space-y-2">
                  {checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2">
                      <PolicyIcon status={check.status} />
                      <div className="min-w-0">
                        <span className="font-mono text-[10.5px] font-medium text-v2-foreground/80">
                          {check.verb}
                        </span>
                        <span className="ml-1.5 font-mono text-[10.5px] text-v2-muted/70">
                          {check.detail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer submit button */}
                <div className="pt-1 border-t border-v2-border/30">
                  <button
                    type="button"
                    disabled={failCount > 0}
                    className="rounded-md bg-v2-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-v2-surface transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
                    title={failCount > 0 ? 'Resolve issues before submitting' : 'Submit for review'}
                  >
                    Submit for review
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* ── Dry-run tab ── */}
            <TabsContent value="dryrun" className="m-0 h-full">
              <div className="px-4 py-3 space-y-4">
                {!canShowDryRun ? (
                  <p className="font-mono text-[11px] text-v2-muted/50">
                    Write a SELECT statement to preview output.
                  </p>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/50">
                        Output schema
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] text-v2-muted/60 border border-v2-border/40 transition-colors hover:border-v2-border hover:text-v2-foreground"
                      >
                        <Play className="h-2.5 w-2.5" strokeWidth={2} />
                        Run dry-run
                      </button>
                    </div>

                    {/* Output schema table */}
                    {selectColumns.length === 0 ? (
                      <p className="font-mono text-[11px] text-v2-muted/50">
                        Add AS aliases to your SELECT columns for schema preview.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-v2-border/40">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-v2-border/40 bg-v2-foreground/[0.02]">
                              <th className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50">Column</th>
                              <th className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50">Type</th>
                              <th className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectColumns.map((col) => (
                              <tr key={col.alias} className="border-b border-v2-border/20 last:border-0">
                                <td className="px-3 py-1.5 font-mono text-[11px] text-v2-foreground">{col.alias}</td>
                                <td className="px-3 py-1.5 font-mono text-[10px] text-v2-muted/70">{col.type ?? 'computed'}</td>
                                <td className="px-3 py-1.5 font-mono text-[10px] text-v2-muted/60">{col.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Sample rows */}
                    <div className="space-y-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/50">
                        Sample rows
                      </span>
                      {selectColumns.length === 0 ? null : (
                        <div className="overflow-x-auto rounded-lg border border-v2-border/40">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-v2-border/40 bg-v2-foreground/[0.02]">
                                {selectColumns.map((col) => (
                                  <th key={col.alias} className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50">
                                    {col.alias}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {SAMPLE_ROWS.map((row, i) => (
                                <tr key={i} className="border-b border-v2-border/20 last:border-0">
                                  {selectColumns.map((col) => {
                                    const val = row[col.alias] ?? (
                                      col.type === 'TIMESTAMP' ? '2026-05-15T14:22:18Z' :
                                      col.type === 'TEXT' ? 'fresh' :
                                      col.type === 'NUMERIC' ? '—' : '—'
                                    )
                                    const isNum = isNumericValue(String(val))
                                    return (
                                      <td
                                        key={col.alias}
                                        className={cn(
                                          'px-3 py-1.5 font-mono text-[11px] text-v2-foreground',
                                          isNum ? 'text-right tabular-nums' : '',
                                        )}
                                      >
                                        {val}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p className="font-mono text-[9.5px] text-v2-muted/40">
                        Sample rows · executed against snapshot 2026-05-15 14:22 UTC · ~340ms · 127,432 rows scanned
                      </p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ── Integration tab ── */}
            <TabsContent value="integration" className="m-0 h-full">
              <div className="px-4 py-3 space-y-4">
                {/* On-chain */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/50">
                      On-chain (Solidity)
                      {onchainCount > 1 && (
                        <span className="ml-2 normal-case text-v2-muted/40">
                          1 of {onchainCount} destinations
                        </span>
                      )}
                    </span>
                  </div>
                  {!firstOnchain ? (
                    <p className="font-mono text-[11px] text-v2-muted/50">
                      Add an on-chain destination in the meta panel to see Solidity integration code.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-v2-border/40 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-v2-border/30 bg-v2-foreground/[0.02] px-3 py-1.5">
                        <span className="font-mono text-[9.5px] text-v2-muted/50">Solidity</span>
                        <CopyButton text={solidityCode} />
                      </div>
                      {/* Plain mono block — no Prism Solidity highlight to avoid adding a dep */}
                      {/* Note: skipping syntax highlight for Solidity/TS; Prism only loaded for SQL */}
                      <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-relaxed text-v2-muted/80 whitespace-pre">
                        {solidityCode}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Off-chain TypeScript */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/50">
                    Off-chain (TypeScript)
                  </span>
                  <div className="rounded-lg border border-v2-border/40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-v2-border/30 bg-v2-foreground/[0.02] px-3 py-1.5">
                      <span className="font-mono text-[9.5px] text-v2-muted/50">TypeScript</span>
                      <CopyButton text={tsCode} />
                    </div>
                    <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-relaxed text-v2-muted/80 whitespace-pre">
                      {tsCode}
                    </pre>
                  </div>
                </div>

                {/* Signing key footer */}
                <p className="font-mono text-[9.5px] text-v2-muted/40">
                  Signed by {providerName} · key {sigKey} (secp256k1)
                </p>
              </div>
            </TabsContent>

            {/* ── Lineage tab ── */}
            <TabsContent value="lineage" className="m-0 h-full">
              <div className="px-4 py-3">
                {codeEmpty ? (
                  <p className="font-mono text-[11px] text-v2-muted/50">
                    Write a SELECT statement to see field lineage.
                  </p>
                ) : selectColumns.length === 0 ? (
                  <p className="font-mono text-[11px] text-v2-muted/50">
                    Add AS aliases to your SELECT columns to see lineage.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-v2-border/40">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-v2-border/40 bg-v2-foreground/[0.02]">
                          <th className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50 w-1/4">Output</th>
                          <th className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted/50">Derived from</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectColumns.map((col) => {
                          // Extract field references from the expression
                          const inputRefs = extractLineageRefs(col.expression, vault)
                          return (
                            <tr key={col.alias} className="border-b border-v2-border/20 last:border-0 align-top">
                              <td className="px-3 py-2 font-mono text-[11px] text-v2-foreground whitespace-nowrap">
                                {col.alias}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {inputRefs.length > 0 ? inputRefs.map((ref, i) => (
                                    <span
                                      key={i}
                                      className="rounded bg-v2-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] text-v2-muted/80"
                                    >
                                      {ref.label}
                                    </span>
                                  )) : (
                                    <span className="font-mono text-[10.5px] text-v2-muted/40">computed</span>
                                  )}
                                  {inputRefs.some((r) => r.note) && (
                                    <span className="font-mono text-[10px] text-v2-muted/40">
                                      {inputRefs.find((r) => r.note)?.note}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  )
}

/** Extract input field references from a SELECT expression for lineage display */
function extractLineageRefs(
  expr: string,
  vault: ConsumerVault | null,
): { label: string; note?: string }[] {
  if (!vault) return []

  const results: { label: string; note?: string }[] = []
  const seen = new Set<string>()

  // Match vault.<slug>.<table>.<field> patterns
  const qualPattern = /vault\.\w+\.(\w+)\.(\w+)/g
  let m: RegExpExecArray | null
  while ((m = qualPattern.exec(expr)) !== null) {
    const label = `${m[1]}.${m[2]}`
    if (!seen.has(label)) {
      seen.add(label)
      results.push({ label })
    }
  }

  // Match bare field names from vault tables (within aggregate expressions)
  const aggMatch = /^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*([\s\S]+?)\s*\)\s*$/i.exec(expr)
  if (aggMatch) {
    const innerExpr = aggMatch[2]
    // If inner expr has a dot-chain, it's already matched above
    if (!innerExpr.includes('.')) {
      // bare field name — find in vault
      for (const tbl of vault.tables) {
        const field = tbl.fields.find((f) => f.name === innerExpr)
        if (field) {
          const label = `${tbl.name}.${field.name}`
          if (!seen.has(label)) {
            seen.add(label)
            results.push({ label })
          }
        }
      }
    }
  }

  // If nothing found, look for bare table.field references (e.g. CTE aliases
  // like nav.current_nav, collateral.total_par). Reject pure-numeric matches
  // so SQL literals like 0.85 don't masquerade as field refs.
  if (results.length === 0) {
    const dotPattern = /\b([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\b/g
    while ((m = dotPattern.exec(expr)) !== null) {
      const label = `${m[1]}.${m[2]}`
      if (!seen.has(label)) {
        seen.add(label)
        results.push({ label })
      }
    }
  }

  return results
}

// ── Private field toast ───────────────────────────────────────────────────────

function PrivateFieldToast({
  visible,
  fieldName,
  onDismiss,
}: {
  visible: boolean
  fieldName: string
  onDismiss: () => void
}) {
  if (!visible) return null
  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 rounded-xl border border-v2-border/60 bg-v2-surface px-4 py-3 shadow-lg">
        <Lock className="h-3.5 w-3.5 shrink-0 text-v2-muted/60" strokeWidth={2} />
        <p className="text-[12.5px] text-v2-muted">
          <span className="font-mono text-v2-foreground">{fieldName}</span>{' '}
          is blocked at ingest — cannot be referenced in any query.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-v2-muted/50 transition-colors hover:text-v2-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ── Meta panel ────────────────────────────────────────────────────────────────

type MetaPanelProps = {
  vault: ConsumerVault
  triggerKind: TriggerKind
  onTriggerKindChange: (k: TriggerKind) => void
  cronExpr: string
  onCronExprChange: (v: string) => void
  eventSource: string
  onEventSourceChange: (v: string) => void
  destinations: Destination[]
  onAddDest: (d: Destination) => void
  onRemoveDest: (i: number) => void
  code: string
}

function MetaPanel({
  vault,
  triggerKind,
  onTriggerKindChange,
  cronExpr,
  onCronExprChange,
  eventSource,
  onEventSourceChange,
  destinations,
  onAddDest,
  onRemoveDest,
  code,
}: MetaPanelProps) {
  const [showAddDest, setShowAddDest] = useState(false)
  const fieldRefs = parseFieldRefs(code, vault)
  const privateRefs = fieldRefs.filter((r) => r.privacy === 'private')
  const joinRefsUsedAsColumn = fieldRefs.filter(
    (r) => r.privacy === 'join' && !r.inGroupBy && !r.wrappedInAggregate
  )
  const aggregateUsedRaw = fieldRefs.filter(
    (r) => r.privacy === 'aggregate' && !r.wrappedInAggregate
  )
  const violations = privateRefs  // private refs = true violations
  const okRefs = fieldRefs.filter((r) => r.privacy !== 'private')

  const VAULT_EVENTS: Record<string, string[]> = {
    'acred': [
      'ACRED redemption queue',
      'ACRED NAV publication',
      'ACRED position event',
    ],
    'maple-tf-revolver': [
      'MAPLE-TF loan event',
      'MAPLE-TF pool rebalance',
    ],
    'buidl-treasury': [
      'BUIDL NAV publication',
    ],
  }

  const events = VAULT_EVENTS[vault.id] ?? []

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-3">
      {/* Trigger */}
      <Surface padding="none" radius="xl" className="overflow-visible">
        <div className="border-b border-v2-border/40 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
            Trigger
          </span>
        </div>
        <div className="px-4 py-3 space-y-3">
          {/* Radio group */}
          <div className="flex gap-1.5">
            {(['cron', 'event', 'manual'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onTriggerKindChange(k)}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-[11px] transition-colors capitalize',
                  triggerKind === k
                    ? 'bg-v2-foreground text-v2-surface'
                    : 'bg-v2-foreground/[0.06] text-v2-muted hover:bg-v2-foreground/[0.1] hover:text-v2-foreground',
                )}
                aria-pressed={triggerKind === k}
              >
                {k}
              </button>
            ))}
          </div>

          {triggerKind === 'cron' && (
            <div className="space-y-2">
              <input
                type="text"
                value={cronExpr}
                onChange={(e) => onCronExprChange(e.target.value)}
                placeholder="* * * * *"
                className="w-full rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 font-mono text-[11.5px] text-v2-foreground placeholder:text-v2-muted/40 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1">
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.expr}
                    type="button"
                    onClick={() => onCronExprChange(p.expr)}
                    className={cn(
                      'rounded px-2 py-0.5 font-mono text-[9.5px] transition-colors',
                      cronExpr === p.expr
                        ? 'bg-v2-foreground text-v2-surface'
                        : 'bg-v2-foreground/[0.05] text-v2-muted/70 hover:bg-v2-foreground/[0.1] hover:text-v2-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {cronExpr && (
                <p className="font-mono text-[10.5px] text-v2-muted/50">
                  {humanizeCron(cronExpr)}
                </p>
              )}
            </div>
          )}

          {triggerKind === 'event' && (
            <select
              value={eventSource}
              onChange={(e) => onEventSourceChange(e.target.value)}
              className="w-full rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[12px] text-v2-foreground focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20"
            >
              <option value="">Select event source…</option>
              {events.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          )}
        </div>
      </Surface>

      {/* Destinations */}
      <Surface padding="none" radius="xl">
        <div className="flex items-center justify-between border-b border-v2-border/40 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
            Destinations
          </span>
          {!showAddDest && (
            <button
              type="button"
              onClick={() => setShowAddDest(true)}
              className="inline-flex items-center gap-1 font-mono text-[10.5px] text-v2-muted transition-colors hover:text-v2-foreground"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              Add
            </button>
          )}
        </div>
        <div className="px-3 py-3 space-y-2">
          {showAddDest && (
            <AddDestForm
              onSave={(d) => {
                onAddDest(d)
                setShowAddDest(false)
              }}
              onCancel={() => setShowAddDest(false)}
            />
          )}

          {destinations.length === 0 && !showAddDest ? (
            <p className="font-mono text-[11px] text-v2-muted/50">
              No destinations yet. Add at least one before submitting.
            </p>
          ) : (
            <div className="space-y-1">
              {destinations.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-v2-border/40 bg-v2-surface-2/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] text-v2-foreground">
                      {d.kind === 'onchain' ? `${d.chain}: ${d.address.slice(0, 10)}…` : d.url}
                    </p>
                    {d.label && (
                      <p className="truncate text-[10.5px] text-v2-muted/50">{d.label}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveDest(i)}
                    className="shrink-0 text-v2-muted/40 transition-colors hover:text-v2-muted"
                    aria-label="Remove destination"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>

      {/* Privacy summary */}
      <Surface padding="none" radius="xl">
        <div className="border-b border-v2-border/40 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
            Privacy summary
          </span>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {fieldRefs.length === 0 ? (
            <p className="font-mono text-[11px] text-v2-muted/50">
              No vault fields detected yet.
            </p>
          ) : (
            <>
              {/* Per-tier counts + bar */}
              {(() => {
                const refCounts = countByPrivacy(fieldRefs)
                const tierSummaryParts: string[] = []
                for (const lvl of PRIVACY_LEVELS_ORDERED) {
                  if (refCounts[lvl] > 0 && lvl !== 'private') {
                    tierSummaryParts.push(`${refCounts[lvl]} ${PRIVACY_TONE[lvl].operationShort}`)
                  }
                }
                if (refCounts.private > 0) tierSummaryParts.push(`${refCounts.private} Blocked`)
                return (
                  <div className="space-y-1">
                    <p className="font-mono text-[10.5px] text-v2-muted/70">
                      {tierSummaryParts.join(' · ')}
                    </p>
                    <PrivacyBar counts={refCounts} height="h-1" />
                  </div>
                )
              })()}

              {/* Field list */}
              <div>
                <span className="font-mono text-[10px] text-v2-muted/50">Reading: </span>
                <span className="font-mono text-[10px] text-v2-muted/80">
                  {okRefs.map((r) => `${r.tableName}.${r.fieldName}`).join(', ')}
                </span>
              </div>

              {/* Status line */}
              {violations.length === 0 && aggregateUsedRaw.length === 0 && joinRefsUsedAsColumn.length === 0 ? (
                <div className="flex items-start gap-1.5">
                  <Check className="mt-px h-3.5 w-3.5 shrink-0 text-v2-success" strokeWidth={2} />
                  <p className="font-mono text-[10.5px] text-v2-foreground">
                    All operations within your access grant.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {violations.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-v2-muted/60" strokeWidth={2} />
                      <p className="font-mono text-[10.5px] text-v2-muted">
                        Cannot reference private fields:{' '}
                        <span className="text-v2-foreground">
                          {violations.map((r) => r.fieldName).join(', ')}
                        </span>
                      </p>
                    </div>
                  )}
                  {joinRefsUsedAsColumn.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-v2-muted/50" strokeWidth={2} />
                      <p className="font-mono text-[10.5px] text-v2-muted/80">
                        Join field referenced — ensure you use it as a match key, not a return column.
                      </p>
                    </div>
                  )}
                  {aggregateUsedRaw.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-v2-muted/50" strokeWidth={2} />
                      <p className="font-mono text-[10.5px] text-v2-muted/80">
                        aggregate field{' '}
                        <span className="text-v2-foreground">{aggregateUsedRaw.map((r) => r.fieldName).join(', ')}</span>{' '}
                        used outside an aggregate function — must be wrapped in SUM/AVG/COUNT/etc.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Surface>
    </div>
  )
}

// ── Main workbench ────────────────────────────────────────────────────────────

export function AnalysisWorkbench({
  initialVaultId,
  fromAnalysisId,
  fromVersion,
}: WorkbenchProps) {
  const router = useRouter()

  // Determine source analysis if coming from `?from=`
  const sourceAnalysis = fromAnalysisId
    ? analyses.find((a) => a.id === fromAnalysisId)
    : null

  // If from a source analysis, pin vault to the source analysis's vault
  const pinnedVaultId = sourceAnalysis?.vaultId ?? null

  // Vault selection state
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(
    pinnedVaultId ?? initialVaultId,
  )
  const [pickerOpen, setPickerOpen] = useState(selectedVaultId === null)

  const vault = selectedVaultId
    ? vaults.find((v) => v.id === selectedVaultId) ?? null
    : null

  // Build initial code scaffold
  const buildScaffold = (v: ConsumerVault | null, name: string): string => {
    if (sourceAnalysis && fromVersion !== null) {
      const srcCode = sourceAnalysis.versions[sourceAnalysis.versions.length - 1]?.code ?? ''
      return `-- Proposing v${fromVersion} of ${sourceAnalysis.name}\n--\n${srcCode}`
    }
    const slug = v?.id.replace(/-/g, '_') ?? 'vault_slug'
    const displayName = name || 'analysis_name'
    return `-- ${displayName}
-- Authoring against vault.${slug}
--
-- Define your computation below. The provider reviews the
-- fields you reference and the resulting payload shape before
-- approving execution.

SELECT
  -- your output columns
FROM
  vault.${slug}.nav_latest`
  }

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState(() => buildScaffold(vault, ''))
  const [triggerKind, setTriggerKind] = useState<TriggerKind>('cron')
  const [cronExpr, setCronExpr] = useState('0 * * * *')
  const [eventSource, setEventSource] = useState('')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [privateToastField, setPrivateToastField] = useState<string | null>(null)
  const privateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Companion panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<CompanionTab>('policy')

  const version = fromVersion ?? 1

  const nameTaken = EXISTING_NAMES.has(name)
  const nameEmpty = name.trim().length === 0

  // Update code scaffold when vault changes
  const handleVaultSelect = (vaultId: string) => {
    setSelectedVaultId(vaultId)
    setPickerOpen(false)
    const v = vaults.find((x) => x.id === vaultId) ?? null
    setCode(buildScaffold(v, name))
  }

  // Insert snippet: if the snippet looks like a full SQL template (starts with --), replace;
  // otherwise append at end of current code.
  const handleInsert = useCallback((snippet: string) => {
    setCode((prev) => {
      // Templates start with '-- ' on the first line; append field refs otherwise
      if (snippet.trimStart().startsWith('-- ') && snippet.includes('\n')) {
        return snippet
      }
      const trimmed = prev.trimEnd()
      return `${trimmed}\n  ${snippet}`
    })
  }, [])

  const showPrivateToast = useCallback((fieldName: string) => {
    setPrivateToastField(fieldName)
    if (privateTimerRef.current) clearTimeout(privateTimerRef.current)
    privateTimerRef.current = setTimeout(() => setPrivateToastField(null), 5000)
  }, [])

  const handleSubmit = () => {
    setDrawerOpen(false)
    router.push(`/cp/analyses?submitted=${encodeURIComponent(name)}`)
  }

  const fieldRefs = vault ? parseFieldRefs(code, vault) : []
  const violations = fieldRefs.filter((r) => r.privacy === 'private')

  // Update scaffold when name changes (update the first comment line)
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    // Update comment at top of code if it's the scaffold default
    setCode((prev) => {
      return prev.replace(
        /^-- [^\n]*/,
        `-- ${newName || 'analysis_name'}`,
      )
    })
  }

  const showPicker = !vault || pickerOpen

  return (
    <>
      {/* Vault picker overlay */}
      <VaultPicker
        open={showPicker}
        onSelect={handleVaultSelect}
        onCancel={() => router.push('/cp/analyses')}
      />

      {/* Workbench — full viewport height minus shell chrome */}
      <div className="flex h-full flex-col px-4 py-4 md:px-6 md:py-4">
        {/* Header strip */}
        <div className="mb-3 flex flex-wrap items-end gap-3 md:flex-nowrap">
          {/* Eyebrow + name input */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-v2-muted/60">
              // NEW ANALYSIS
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="analysis_name"
                  autoFocus
                  className="rounded-md border border-v2-border/60 bg-transparent px-2.5 py-1 font-mono text-[15px] font-semibold text-v2-foreground placeholder:text-v2-muted/30 focus:border-v2-foreground/30 focus:outline-none focus:ring-1 focus:ring-v2-foreground/20 w-64"
                  aria-label="Analysis name"
                />
                {name && nameTaken && (
                  <p className="mt-0.5 font-mono text-[10.5px] text-v2-muted/60">
                    taken —{' '}
                    <button
                      type="button"
                      onClick={() => setName(suggestName(name))}
                      className="underline underline-offset-2 hover:text-v2-foreground"
                    >
                      try {suggestName(name)}
                    </button>
                  </p>
                )}
              </div>

              {vault && (
                <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-v2-muted">
                  <div className="flex items-center gap-2">
                    <span>Authoring against</span>
                    <span className="font-semibold text-v2-foreground">{vault.label}</span>
                    {!pinnedVaultId && (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="font-mono text-[11px] text-v2-muted/60 underline underline-offset-2 transition-colors hover:text-v2-foreground"
                      >
                        change vault
                      </button>
                    )}
                  </div>
                  {/* Template popover — visible next to vault line until code is authored */}
                  <TemplatePopover
                    templates={vault.templates}
                    currentCode={code}
                    onInsert={handleInsert}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right side: status + submit */}
          <div className="flex items-center gap-3 shrink-0">
            <StatusPill tone="neutral" size="xs">
              Draft
            </StatusPill>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md bg-v2-foreground px-4 py-2 font-mono text-[12px] font-medium text-v2-surface transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
            >
              Submit for review
            </button>
            <Link
              href="/cp/analyses"
              className="inline-flex items-center gap-1 rounded-md border border-v2-border/60 px-3 py-1.5 font-mono text-[11.5px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={2} />
              Back
            </Link>
          </div>
        </div>

        {/* 3-column grid */}
        <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] border border-v2-border/60 rounded-xl overflow-hidden bg-v2-surface">
          {/* Left: schema browser */}
          <div className="hidden xl:flex xl:flex-col border-r border-v2-border overflow-hidden">
            {vault ? (
              <SchemaPanel
                vault={vault}
                onInsert={handleInsert}
                onPrivateClick={showPrivateToast}
                currentCode={code}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="font-mono text-[11px] text-v2-muted/40">
                  Select a vault to browse schema
                </p>
              </div>
            )}
          </div>

          {/* Middle: code editor + companion panel */}
          <div className="flex flex-col min-h-[400px] xl:min-h-0 border-b xl:border-b-0 xl:border-r border-v2-border/40 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditorPanel code={code} onChange={setCode} />
            </div>
            <CompanionPanel
              open={panelOpen}
              onToggle={() => setPanelOpen((v) => !v)}
              activeTab={activeTab}
              onTabChange={(t) => {
                setActiveTab(t)
                if (!panelOpen) setPanelOpen(true)
              }}
              code={code}
              vault={vault}
              fieldRefs={fieldRefs}
              destinations={destinations}
              name={name}
            />
          </div>

          {/* Right: meta panel */}
          <div className="overflow-hidden">
            {vault ? (
              <MetaPanel
                vault={vault}
                triggerKind={triggerKind}
                onTriggerKindChange={setTriggerKind}
                cronExpr={cronExpr}
                onCronExprChange={setCronExpr}
                eventSource={eventSource}
                onEventSourceChange={setEventSource}
                destinations={destinations}
                onAddDest={(d) => setDestinations((prev) => [...prev, d])}
                onRemoveDest={(i) => setDestinations((prev) => prev.filter((_, idx) => idx !== i))}
                code={code}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="font-mono text-[11px] text-v2-muted/40">
                  Select a vault
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit drawer */}
      {vault && (
        <SubmitDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSubmit={handleSubmit}
          analysisName={name}
          vault={vault}
          version={version}
          triggerKind={triggerKind}
          cronExpr={cronExpr}
          eventSource={eventSource}
          destinations={destinations}
          code={code}
          fieldRefs={fieldRefs}
          hasViolations={violations.length > 0}
        />
      )}

      {/* Private field toast */}
      <PrivateFieldToast
        visible={privateToastField !== null}
        fieldName={privateToastField ?? ''}
        onDismiss={() => setPrivateToastField(null)}
      />
    </>
  )
}
