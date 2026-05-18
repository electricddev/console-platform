'use client'

import {
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
} from 'lucide-react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  buildPolicyChecksWithKMin,
  buildCodeChecks,
  parseSelectColumns,
  hasFromClause,
  extractLineageRefs,
  getNextCronExecutions,
  countCronExecutionsIn30Days,
  buildAssertions,
  formatExecutionTime,
  COMPUTE_COST_PER_EXEC,
  GAS_PER_WRITE,
  type PolicyCheckStatus,
} from '@/components/v2/features/cp/analysis-workbench'
import { CopyButton } from './copy-button'
import type { CompanionTab, CompanionPanelProps } from './companion-panel.types'
import { useCompanionContext } from './companion-context'
import { usePanelResize } from './use-panel-resize'

// ── Fixture sample rows (ACRED canonical) ─────────────────────────────────────

const SAMPLE_ROWS: Record<string, string>[] = [
  { advance_rate: '0.85', nav_usd: '425,371,892.54', eligible_par: '478,231,015.22', as_of: '2026-05-15T14:22:18Z' },
  { advance_rate: '0.84', nav_usd: '419,205,119.18', eligible_par: '482,007,283.61', as_of: '2026-05-15T14:21:14Z' },
]

/** Numeric-looking values should be right-aligned */
function isNumericValue(v: string): boolean {
  return /^[\d,.\-+e]+$/.test(v.trim())
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

// ── CompanionPanel ────────────────────────────────────────────────────────────

export function CompanionPanel({
  open,
  onToggle,
  activeTab,
  onTabChange,
}: CompanionPanelProps) {
  const { height, setHeight, startDrag } = usePanelResize({
    initial: 320,
    min: 40,
    maxRatio: 0.75,
    storageKey: 'analysis-workbench:panel-height',
  })

  const { code, vault, fieldRefs, destinations, name, triggerKind, cronExpr, eventSource, onchainDests } = useCompanionContext()

  // ── Access & policy checks
  const policyChecks = buildPolicyChecksWithKMin({ fieldRefs, destinations, name, vault })
  const policyFailCount = policyChecks.filter((c) => c.status === 'fail').length

  // ── Code hygiene checks
  const codeChecks = buildCodeChecks(code)
  const codeFailCount = codeChecks.filter((c) => c.status === 'fail').length

  // Total badge on the Validate tab
  const validateFailCount = codeFailCount + policyFailCount

  const selectColumns = parseSelectColumns(code, vault)
  const hasFrom = hasFromClause(code)
  const codeEmpty = code.trim().length === 0 || !hasFrom

  // ── Assertions for Tests tab
  const assertions = buildAssertions(selectColumns)

  // ── Schedule & Cost tab
  const NOW = new Date()
  const nextExecutions =
    triggerKind === 'cron'
      ? getNextCronExecutions(cronExpr, NOW, 5)
      : null
  const gasPerExec = onchainDests.reduce((sum, d) => sum + (GAS_PER_WRITE[d.chain] ?? 0), 0)
  const totalCostPerExec = COMPUTE_COST_PER_EXEC + gasPerExec

  const runsIn30Days =
    triggerKind === 'cron' ? (countCronExecutionsIn30Days(cronExpr) ?? 0) : 0
  const monthlyCost = runsIn30Days * totalCostPerExec

  // ── Integration tab
  const firstOnchain = onchainDests[0] ?? null
  const onchainCount = onchainDests.length

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

  const verifyTsCode = `import { ethers } from 'ethers'

// Verify a Hyve signed payload off-chain.
function verifyHyvePayload(
  payload: Uint8Array,
  asOf: bigint,
  signature: string,
  signerAddress: string,
): boolean {
  // The signed message is keccak256(abi.encode(payload, asOf))
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'uint64'],
    [payload, asOf],
  )
  const hash = ethers.keccak256(encoded)
  const recovered = ethers.recoverAddress(
    ethers.hashMessage(ethers.getBytes(hash)),
    signature,
  )
  return recovered.toLowerCase() === signerAddress.toLowerCase()
}`

  // Determine if we can show sample rows: code has FROM and at least one column
  const canShowDryRun = hasFrom && !codeEmpty

  // Handle tab click — if panel closed, open it too
  const handleTabTriggerClick = (tab: CompanionTab) => {
    onTabChange(tab)
  }

  return (
    <div
      data-companion-panel
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
          aria-valuemax={Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.75)}
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
          className="h-1.5 cursor-row-resize touch-none select-none border-b border-v2-border/40 transition-colors hover:bg-v2-foreground/[0.08] focus-visible:bg-v2-foreground/[0.12] focus-visible:outline-none"
        />
      )}
      {/* Tab strip */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          onTabChange(v as CompanionTab)
          if (!open) onToggle()
        }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center border-b border-v2-border">
          <TabsList
            variant="line"
            className="h-9 flex-1 w-full justify-start gap-0 rounded-none bg-transparent p-0"
          >
            {(
              [
                { value: 'validate', label: 'Validate', badge: validateFailCount },
                { value: 'dryrun', label: 'Dry-run', badge: 0 },
                { value: 'tests', label: 'Tests', badge: 0 },
                { value: 'schedule', label: 'Schedule & Cost', badge: 0 },
                { value: 'integration', label: 'Integration', badge: 0 },
                { value: 'terminal', label: 'Terminal', badge: 0 },
              ] as const
            ).map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'relative h-9 rounded-none px-3 font-mono text-[11px] tracking-[0.04em] text-v2-muted data-[state=active]:text-v2-foreground',
                  'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-v2-foreground after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
                  'hover:text-v2-foreground',
                  'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                )}
                onClick={() => handleTabTriggerClick(tab.value)}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-v2-warning/20 px-1 font-mono text-[9px] text-v2-warning">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Chevron toggle */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Collapse companion panel' : 'Expand companion panel'}
            className="mr-2 flex h-7 w-7 items-center justify-center rounded text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
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
            {/* ── Validate tab ── */}
            <TabsContent value="validate" className="m-0 h-full">
              <div className="px-4 py-3 space-y-4">
                {/* Overall status header */}
                <div className="flex items-center gap-2">
                  {validateFailCount === 0 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
                      <span className="font-mono text-[11px] text-v2-success">Ready to submit</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-v2-warning" />
                      <span className="font-mono text-[11px] text-v2-warning">{validateFailCount} issue{validateFailCount !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>

                {/* ── Section 1: Code ── */}
                <div className="space-y-2">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Code
                  </p>
                  <div className="space-y-1.5">
                    {codeChecks.map((check) => (
                      <div key={check.id} className="flex items-start gap-2">
                        <PolicyIcon status={check.status} />
                        <div className="min-w-0">
                          <span className="font-mono text-[10.5px] font-medium text-v2-foreground">
                            {check.verb}
                          </span>
                          <span className="ml-1.5 font-mono text-[10.5px] text-v2-muted">
                            {check.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Section 2: Access & policy ── */}
                <div className="space-y-2 border-t border-v2-border/60 pt-3">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Access &amp; policy
                  </p>
                  <div className="space-y-1.5">
                    {policyChecks.map((check) => (
                      <div key={check.id} className="flex items-start gap-2">
                        <PolicyIcon status={check.status} />
                        <div className="min-w-0">
                          <span className="font-mono text-[10.5px] font-medium text-v2-foreground">
                            {check.verb}
                          </span>
                          <span className="ml-1.5 font-mono text-[10.5px] text-v2-muted">
                            {check.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer submit button */}
                <div className="pt-1 border-t border-v2-border/60">
                  <button
                    type="button"
                    disabled={validateFailCount > 0}
                    className="rounded-md bg-v2-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-v2-surface transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
                    title={validateFailCount > 0 ? 'Resolve issues before submitting' : 'Submit for review'}
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
                  <p className="font-mono text-[11px] text-v2-muted">
                    Write a SELECT statement to preview output.
                  </p>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                        Output schema
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] text-v2-muted border border-v2-border/60 transition-colors hover:border-v2-border hover:text-v2-foreground"
                      >
                        <Play className="h-2.5 w-2.5" strokeWidth={2} />
                        Run dry-run
                      </button>
                    </div>

                    {/* Output schema table — lineage inline as footnote */}
                    {selectColumns.length === 0 ? (
                      <p className="font-mono text-[11px] text-v2-muted">
                        Add AS aliases to your SELECT columns for schema preview.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-v2-border/60">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-v2-border/60 bg-v2-foreground/[0.04]">
                              <th className="px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Column</th>
                              <th className="px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Type</th>
                              <th className="px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectColumns.map((col) => {
                              const inputRefs = extractLineageRefs(col.expression, vault)
                              return (
                                <tr key={col.alias} className="border-b border-v2-border/60 last:border-0 align-top">
                                  <td className="px-3 py-1.5 font-mono text-[11px] text-v2-foreground">
                                    {col.alias}
                                    {inputRefs.length > 0 && (
                                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                        <span className="font-mono text-[9.5px] text-v2-muted">←</span>
                                        {inputRefs.map((ref, i) => (
                                          <span
                                            key={i}
                                            className="rounded bg-v2-foreground/[0.05] px-1 py-px font-mono text-[9.5px] text-v2-muted"
                                          >
                                            {ref.label}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-[10px] text-v2-muted">{col.type ?? 'computed'}</td>
                                  <td className="px-3 py-1.5 font-mono text-[10px] text-v2-muted">{col.source}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Sample rows */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                        Sample rows
                      </span>
                      {selectColumns.length === 0 ? null : (
                        <div className="overflow-x-auto rounded-lg border border-v2-border/60">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-v2-border/60 bg-v2-foreground/[0.04]">
                                {selectColumns.map((col) => (
                                  <th key={col.alias} className="px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                                    {col.alias}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {SAMPLE_ROWS.map((row, i) => (
                                <tr key={i} className="border-b border-v2-border/60 last:border-0">
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

                      <p className="font-mono text-[9.5px] text-v2-muted">
                        Sample rows · executed against snapshot 2026-05-15 14:22 UTC · ~340ms · 127,432 rows scanned
                      </p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ── Tests tab ── */}
            <TabsContent value="tests" className="m-0 h-full">
              <div className="px-4 py-3 space-y-3">
                {selectColumns.length === 0 ? (
                  <p className="font-mono text-[11px] text-v2-muted">
                    Write a SELECT statement to define assertions on output columns.
                  </p>
                ) : (
                  <>
                    {/* Assertion rows */}
                    <div className="space-y-1.5">
                      {assertions.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg border border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[11px] text-v2-foreground">
                              {a.label}
                            </span>
                            <span className="ml-2 font-mono text-[10px] text-v2-muted">
                              {a.detail}
                            </span>
                          </div>
                          <button
                            type="button"
                            title="Configure assertion"
                            className="shrink-0 rounded p-1 text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M8 1.5a.5.5 0 0 1 .5.5v1.05A4.505 4.505 0 0 1 12 7.5a.5.5 0 0 1-1 0A3.5 3.5 0 0 0 7.5 4a3.5 3.5 0 0 0-3.498 3.322L4 7.5a.5.5 0 0 1-1 0 4.505 4.505 0 0 1 3.5-4.45V2a.5.5 0 0 1 .5-.5zM2.5 9a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0 2.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                          </button>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px]',
                              a.status === 'will-run'
                                ? 'bg-v2-foreground/[0.06] text-v2-muted'
                                : a.status === 'passed'
                                  ? 'bg-v2-success/10 text-v2-success'
                                  : 'bg-v2-danger/10 text-v2-danger',
                            )}
                          >
                            {a.status === 'will-run' ? 'Will run' : a.status === 'passed' ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Add assertion */}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-v2-border/60 px-3 py-1.5 font-mono text-[10.5px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2} />
                      Add assertion
                    </button>

                    <p className="font-mono text-[9.5px] text-v2-muted">
                      {assertions.length} assertion{assertions.length !== 1 ? 's' : ''} · all execute before the signed payload is published
                    </p>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ── Schedule & Cost tab ── */}
            <TabsContent value="schedule" className="m-0 h-full">
              <div className="px-4 py-3 space-y-4">

                {/* Next executions */}
                <div className="space-y-2">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Next 5 executions
                  </p>
                  {triggerKind === 'manual' ? (
                    <p className="font-mono text-[11px] text-v2-muted">
                      Triggered on demand only — no scheduled executions.
                    </p>
                  ) : triggerKind === 'event' ? (
                    <p className="font-mono text-[11px] text-v2-muted">
                      On {eventSource || '(select an event source)'}
                    </p>
                  ) : nextExecutions === null ? (
                    <p className="font-mono text-[11px] text-v2-warning/80">
                      Could not parse cron expression — check syntax.
                    </p>
                  ) : (
                    <ol className="space-y-1">
                      {nextExecutions.map((d, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="font-mono text-[9.5px] text-v2-muted w-4 text-right tabular-nums">
                            {i + 1}
                          </span>
                          <span className="font-mono text-[11px] text-v2-foreground tabular-nums">
                            {formatExecutionTime(d)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Cost estimate */}
                <div className="space-y-2 border-t border-v2-border/60 pt-3">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Cost estimate
                  </p>

                  {/* Per-execution breakdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10.5px] text-v2-muted">Compute</span>
                      <span className="font-mono text-[10.5px] tabular-nums text-v2-foreground">
                        ${COMPUTE_COST_PER_EXEC.toFixed(4)} per execution
                      </span>
                    </div>
                    {onchainDests.length === 0 ? (
                      <p className="font-mono text-[10.5px] text-v2-muted">
                        Add a destination in the meta panel to estimate gas cost.
                      </p>
                    ) : (
                      onchainDests.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="font-mono text-[10.5px] text-v2-muted">
                            {d.chain} gas · {d.label || d.address.slice(0, 8) + '…'}
                          </span>
                          <span className="font-mono text-[10.5px] tabular-nums text-v2-foreground">
                            ${(GAS_PER_WRITE[d.chain] ?? 0).toFixed(3)} per write
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Monthly projection */}
                  {triggerKind === 'cron' && runsIn30Days > 0 && onchainDests.length > 0 && (
                    <div className="rounded-lg border border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-2 mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10.5px] text-v2-muted">Executions / 30 days</span>
                        <span className="font-mono text-[10.5px] tabular-nums text-v2-foreground">{runsIn30Days.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-v2-border/60 pt-1">
                        <span className="font-mono text-[10.5px] font-medium text-v2-foreground">Monthly total</span>
                        <span className="font-mono text-[11px] font-medium tabular-nums text-v2-foreground">
                          ~${monthlyCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="font-mono text-[9.5px] text-v2-muted leading-snug">
                    Estimates are illustrative — actual gas varies with network conditions.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── Integration tab ── */}
            <TabsContent value="integration" className="m-0 h-full">
              <div className="px-4 py-3 space-y-4">
                {/* On-chain */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                      On-chain (Solidity)
                      {onchainCount > 1 && (
                        <span className="ml-2 normal-case text-v2-muted">
                          1 of {onchainCount} destinations
                        </span>
                      )}
                    </span>
                  </div>
                  {!firstOnchain ? (
                    <p className="font-mono text-[11px] text-v2-muted">
                      Add an on-chain destination in the meta panel to see Solidity integration code.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-v2-border/60 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-1.5">
                        <span className="font-mono text-[9.5px] text-v2-muted">Solidity</span>
                        <CopyButton text={solidityCode} />
                      </div>
                      <pre className="overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-v2-foreground whitespace-pre">
                        {solidityCode}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Off-chain TypeScript */}
                <div className="space-y-2">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Off-chain (TypeScript)
                  </span>
                  <div className="rounded-lg border border-v2-border/60 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-1.5">
                      <span className="font-mono text-[9.5px] text-v2-muted">TypeScript</span>
                      <CopyButton text={tsCode} />
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-v2-foreground whitespace-pre">
                      {tsCode}
                    </pre>
                  </div>
                </div>

                {/* Signature verification */}
                <div className="space-y-2 border-t border-v2-border/60 pt-3">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                    Signature verification
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-v2-muted">
                    Every payload published by Hyve is signed with the provider&apos;s secp256k1 key using
                    Ethereum&apos;s personal_sign convention — keccak256 over the ABI-encoded (payload, asOf) tuple.
                    Verify on-chain with Solidity&apos;s <code className="font-mono text-[10.5px]">ecrecover</code>,
                    or off-chain with <code className="font-mono text-[10.5px]">ethers.recoverAddress</code>.
                    The signer address for this vault is registered in the Hyve registry contract and rotated
                    quarterly with a 72-hour notice period.
                  </p>
                  <div className="rounded-lg border border-v2-border/60 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-1.5">
                      <span className="font-mono text-[9.5px] text-v2-muted">TypeScript · verify</span>
                      <CopyButton text={verifyTsCode} />
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-v2-foreground whitespace-pre">
                      {verifyTsCode}
                    </pre>
                  </div>
                  <p className="font-mono text-[9.5px] text-v2-muted">
                    Signed by {providerName} · key {sigKey} (secp256k1)
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── Terminal tab ── */}
            <TabsContent value="terminal" className="m-0 h-full">
              <div className="px-4 py-3">
                <p className="font-mono text-[11px] text-v2-muted">Terminal coming online…</p>
              </div>
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  )
}
