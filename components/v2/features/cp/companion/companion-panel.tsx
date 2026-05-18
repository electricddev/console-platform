'use client'

import {
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
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
  type PolicyCheckStatus,
} from '@/components/v2/features/cp/analysis-workbench'
import { CopyButton } from './copy-button'
import type { CompanionTab, CompanionPanelProps } from './companion-panel.types'
import { useCompanionContext } from './companion-context'
import { usePanelResize } from './use-panel-resize'
import { ValidateTab } from './validate-tab'
import { DryRunTab } from './dryrun-tab'
import { TestsTab } from './tests-tab'
import { ScheduleTab } from './schedule-tab'

// ── Fixture sample rows (ACRED canonical) ─────────────────────────────────────

export const SAMPLE_ROWS: Record<string, string>[] = [
  { advance_rate: '0.85', nav_usd: '425,371,892.54', eligible_par: '478,231,015.22', as_of: '2026-05-15T14:22:18Z' },
  { advance_rate: '0.84', nav_usd: '419,205,119.18', eligible_par: '482,007,283.61', as_of: '2026-05-15T14:21:14Z' },
]

/** Numeric-looking values should be right-aligned */
export function isNumericValue(v: string): boolean {
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

  const { code, vault, fieldRefs, destinations, name, onchainDests } = useCompanionContext()

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
              <ValidateTab onTabChange={onTabChange} />
            </TabsContent>

            {/* ── Dry-run tab ── */}
            <TabsContent value="dryrun" className="m-0 h-full">
              <DryRunTab />
            </TabsContent>

            {/* ── Tests tab ── */}
            <TabsContent value="tests" className="m-0 h-full">
              <TestsTab />
            </TabsContent>

            {/* ── Schedule & Cost tab ── */}
            <TabsContent value="schedule" className="m-0 h-full">
              <ScheduleTab />
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
