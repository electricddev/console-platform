'use client'

import {
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
} from '@/components/v2/features/cp/analysis-workbench'
import type { CompanionTab, CompanionPanelProps } from './companion-panel.types'
import { useCompanionContext } from './companion-context'
import { usePanelResize } from './use-panel-resize'
import { ValidateTab } from './validate-tab'
import { DryRunTab } from './dryrun-tab'
import { TestsTab } from './tests-tab'
import { ScheduleTab } from './schedule-tab'
import { IntegrationTab } from './integration-tab'

// ── Fixture sample rows (ACRED canonical) ─────────────────────────────────────

export const SAMPLE_ROWS: Record<string, string>[] = [
  { advance_rate: '0.85', nav_usd: '425,371,892.54', eligible_par: '478,231,015.22', as_of: '2026-05-15T14:22:18Z' },
  { advance_rate: '0.84', nav_usd: '419,205,119.18', eligible_par: '482,007,283.61', as_of: '2026-05-15T14:21:14Z' },
]

/** Numeric-looking values should be right-aligned */
export function isNumericValue(v: string): boolean {
  return /^[\d,.\-+e]+$/.test(v.trim())
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

  const { code, vault, fieldRefs, destinations, name } = useCompanionContext()

  // ── Access & policy checks
  const policyChecks = buildPolicyChecksWithKMin({ fieldRefs, destinations, name, vault })
  const policyFailCount = policyChecks.filter((c) => c.status === 'fail').length

  // ── Code hygiene checks
  const codeChecks = buildCodeChecks(code)
  const codeFailCount = codeChecks.filter((c) => c.status === 'fail').length

  // Total badge on the Validate tab
  const validateFailCount = codeFailCount + policyFailCount

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
              <IntegrationTab />
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
