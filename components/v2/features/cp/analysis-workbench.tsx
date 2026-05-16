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
  Lock,
  Plus,
  X,
  Check,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import {
  analyses,
  vaults,
  type ConsumerVault,
  type VaultFunction,
  type VaultField,
  type FieldTier,
} from '@/components/v2/features/cp/cp-fixtures'

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

type FieldRef = { funcName: string; fieldName: string; tier: FieldTier }

function parseFieldRefs(code: string, vault: ConsumerVault): FieldRef[] {
  const refs: FieldRef[] = []
  const seen = new Set<string>()

  for (const fn of vault.functions) {
    // Match vault.<slug>.<fn>().<field> or unqualified field names
    const qualPattern = new RegExp(
      `vault\\.\\w+\\.${fn.name}\\(\\)\\.([a-z_]+)`,
      'g',
    )
    let m
    while ((m = qualPattern.exec(code)) !== null) {
      const fieldName = m[1]
      const field = fn.fields.find((f) => f.name === fieldName)
      if (field && !seen.has(`${fn.name}.${fieldName}`)) {
        seen.add(`${fn.name}.${fieldName}`)
        refs.push({ funcName: fn.name, fieldName, tier: field.tier })
      }
    }

    // Also match bare field names that appear in SELECT / WHERE and match known fields
    for (const field of fn.fields) {
      const barePattern = new RegExp(
        `\\b${field.name}\\b`,
        'g',
      )
      if (barePattern.test(code) && !seen.has(`${fn.name}.${field.name}`)) {
        // Only add if function is referenced (vault.<slug>.<fn> appears in code)
        const fnRef = new RegExp(`vault\\.\\w+\\.${fn.name}\\(\\)`)
        if (fnRef.test(code)) {
          seen.add(`${fn.name}.${field.name}`)
          refs.push({ funcName: fn.name, fieldName: field.name, tier: field.tier })
        }
      }
    }
  }

  return refs
}

// ── Tier pill ─────────────────────────────────────────────────────────────────

function TierPill({ tier, accessible }: { tier: FieldTier; accessible: boolean }) {
  if (tier === 'public') return null
  const label = tier === 'tier_1' ? 'T1' : tier === 'tier_2' ? 'T2' : 'T3'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 py-px font-mono text-[9px] uppercase tracking-widest',
        !accessible
          ? 'border border-v2-border text-v2-muted/60'
          : 'bg-v2-foreground/[0.06] text-v2-muted/70',
      )}
    >
      {!accessible && <Lock className="h-2 w-2" strokeWidth={2} />}
      {label}
    </span>
  )
}

// ── Schema browser ────────────────────────────────────────────────────────────

function SchemaPanel({
  vault,
  onInsert,
  onTier3Click,
}: {
  vault: ConsumerVault
  onInsert: (snippet: string) => void
  onTier3Click: () => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    vault.functions.forEach((f) => s.add(f.name))
    return s
  })

  const toggleFn = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const isAccessible = (tier: FieldTier) => vault.accessibleTiers.includes(tier)

  const slug = vault.id.replace(/-/g, '_')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-v2-border/40 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted/60">
          SCHEMA
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-1 flex items-center gap-1 px-1 py-1">
          <span className="font-mono text-[11px] text-v2-muted/60">vault.</span>
          <span className="font-mono text-[11px] font-semibold text-v2-foreground">{slug}</span>
        </div>

        {vault.functions.map((fn) => {
          const isOpen = expanded.has(fn.name)
          return (
            <div key={fn.name} className="mb-1">
              {/* Function header */}
              <button
                type="button"
                onClick={() => toggleFn(fn.name)}
                title={fn.description}
                className="flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left transition-colors hover:bg-v2-foreground/[0.04]"
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-v2-muted/50" strokeWidth={2} />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-v2-muted/50" strokeWidth={2} />
                )}
                <span className="font-mono text-[11.5px] text-v2-foreground">
                  {fn.name}
                  <span className="text-v2-muted/50">()</span>
                </span>
                {fn.cadence && (
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] text-v2-muted/40">
                    {fn.cadence}
                  </span>
                )}
              </button>

              {/* Fields */}
              {isOpen && (
                <div className="ml-2 border-l border-v2-border/30 pl-2">
                  {fn.fields.map((field) => {
                    const accessible = isAccessible(field.tier)
                    const snippet = `vault.${slug}.${fn.name}().${field.name}`
                    return (
                      <button
                        key={field.name}
                        type="button"
                        title={
                          accessible
                            ? field.description
                            : `Tier 3 — not accessible under your grant. Request access from the provider.`
                        }
                        onClick={() => {
                          if (!accessible) {
                            onTier3Click()
                          } else {
                            onInsert(snippet)
                          }
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors',
                          accessible
                            ? 'hover:bg-v2-foreground/[0.04]'
                            : 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate font-mono text-[11px]',
                            accessible ? 'text-v2-foreground' : 'text-v2-muted/50',
                          )}
                        >
                          {field.name}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-v2-muted/40">
                          {field.type}
                        </span>
                        <TierPill tier={field.tier} accessible={accessible} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-v2-border/40 px-3 py-2">
        <span className="font-mono text-[10px] text-v2-muted/50">
          Access granted:{' '}
          {vault.accessibleTiers.map((t) => (
            t === 'public' ? 'Public' : t === 'tier_1' ? 'Tier 1' : t === 'tier_2' ? 'Tier 2' : 'Tier 3'
          )).join(', ')}
        </span>
      </div>
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

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Line numbers */}
      <div
        aria-hidden="true"
        className="select-none border-r border-v2-border/30 px-3 pt-4 text-right"
        style={{ minWidth: '3rem' }}
      >
        <pre className="font-mono text-[11px] leading-[1.6] text-v2-muted/30">
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </pre>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <Editor
          value={code}
          onValueChange={onChange}
          highlight={highlightSQL}
          tabSize={2}
          insertSpaces
          className="code-editor-root min-h-full"
          textareaClassName="code-editor-textarea outline-none"
          preClassName="code-editor-pre"
          style={{
            fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
            fontSize: '11.5px',
            lineHeight: '1.6',
            padding: '1rem',
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
                      key={`${r.funcName}.${r.fieldName}`}
                      className="rounded bg-v2-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-v2-muted"
                    >
                      {r.funcName}.{r.fieldName}
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
                  · Tier 3 fields are referenced — remove them or request expanded access
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
                  {vault.provider.name} · {vault.functions.length} functions · {vault.myAnalysisCount} analyses authored
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

// ── Tier-3 tooltip ────────────────────────────────────────────────────────────

function Tier3Toast({
  visible,
  onDismiss,
}: {
  visible: boolean
  onDismiss: () => void
}) {
  if (!visible) return null
  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 rounded-xl border border-v2-border/60 bg-v2-surface px-4 py-3 shadow-lg">
        <Lock className="h-3.5 w-3.5 shrink-0 text-v2-muted/60" strokeWidth={2} />
        <p className="text-[12.5px] text-v2-muted">
          Tier 3 — not accessible under your grant.{' '}
          <span className="text-v2-foreground">Request access from the provider.</span>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-v2-muted/50 transition-colors hover:text-v2-foreground"
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
  const violations = fieldRefs.filter((r) => !vault.accessibleTiers.includes(r.tier))
  const okRefs = fieldRefs.filter((r) => vault.accessibleTiers.includes(r.tier))

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
        <div className="px-4 py-3 space-y-2">
          {fieldRefs.length === 0 ? (
            <p className="font-mono text-[11px] text-v2-muted/50">
              No vault fields detected yet.
            </p>
          ) : (
            <>
              <div>
                <span className="font-mono text-[10.5px] text-v2-muted/60">Reading: </span>
                <span className="font-mono text-[10.5px] text-v2-muted">
                  {okRefs.map((r) => `${r.funcName}.${r.fieldName}`).join(', ')}
                </span>
              </div>
              {violations.length === 0 ? (
                <div className="flex items-start gap-1.5">
                  <Check className="mt-px h-3.5 w-3.5 shrink-0 text-v2-success" strokeWidth={2} />
                  <p className="font-mono text-[10.5px] text-v2-foreground">
                    All fields within your access grant
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle
                      className="mt-px h-3.5 w-3.5 shrink-0 text-v2-warning"
                      strokeWidth={2}
                    />
                    <div>
                      <p className="font-mono text-[10.5px] text-v2-warning">
                        NOT accessible:{' '}
                        {violations.map((r) => r.fieldName).join(', ')} (Tier 3)
                      </p>
                    </div>
                  </div>
                  <p className="pl-5 font-mono text-[10px] text-v2-muted/60 leading-relaxed">
                    Request expanded access from the provider before submitting.
                  </p>
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
  vault.${slug}.nav_latest()`
  }

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState(() => buildScaffold(vault, ''))
  const [triggerKind, setTriggerKind] = useState<TriggerKind>('cron')
  const [cronExpr, setCronExpr] = useState('0 * * * *')
  const [eventSource, setEventSource] = useState('')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tier3ToastVisible, setTier3ToastVisible] = useState(false)
  const tier3TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Insert snippet at end of code (cursor tracking with react-simple-code-editor is complex;
  // append to end with a comment note is the pragmatic approach for this fixture demo)
  const handleInsert = useCallback((snippet: string) => {
    setCode((prev) => {
      const trimmed = prev.trimEnd()
      return `${trimmed}\n  ${snippet}`
    })
  }, [])

  const showTier3Toast = useCallback(() => {
    setTier3ToastVisible(true)
    if (tier3TimerRef.current) clearTimeout(tier3TimerRef.current)
    tier3TimerRef.current = setTimeout(() => setTier3ToastVisible(false), 4000)
  }, [])

  const handleSubmit = () => {
    setDrawerOpen(false)
    router.push(`/cp/analyses?submitted=${encodeURIComponent(name)}`)
  }

  const fieldRefs = vault ? parseFieldRefs(code, vault) : []
  const violations = fieldRefs.filter((r) => vault && !vault.accessibleTiers.includes(r.tier))

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
                <div className="flex items-center gap-2 text-[12.5px] text-v2-muted">
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
        <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[260px_1fr_320px] border border-v2-border/60 rounded-xl overflow-hidden bg-v2-surface">
          {/* Left: schema browser */}
          <div className="hidden xl:flex xl:flex-col border-r border-v2-border/40 overflow-hidden">
            {vault ? (
              <SchemaPanel
                vault={vault}
                onInsert={handleInsert}
                onTier3Click={showTier3Toast}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="font-mono text-[11px] text-v2-muted/40">
                  Select a vault to browse schema
                </p>
              </div>
            )}
          </div>

          {/* Middle: code editor */}
          <div className="flex flex-col min-h-[400px] xl:min-h-0 border-b xl:border-b-0 xl:border-r border-v2-border/40 overflow-hidden">
            <CodeEditorPanel code={code} onChange={setCode} />
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

      {/* Tier-3 toast */}
      <Tier3Toast
        visible={tier3ToastVisible}
        onDismiss={() => setTier3ToastVisible(false)}
      />
    </>
  )
}
