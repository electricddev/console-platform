'use client'

import { Check, AlertTriangle, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildCodeChecks,
  buildPolicyChecksWithKMin,
  type PolicyCheckStatus,
} from '@/components/v2/features/cp/analysis-workbench'
import { useCompanionContext } from './companion-context'
import type { CompanionTab } from './companion-panel.types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Check = {
  id: string
  status: PolicyCheckStatus
  verb: string
  detail: string
}

type InlineAction = { label: string; onClick: () => void } | null

// ── Severity sort order ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<PolicyCheckStatus, number> = {
  fail: 0,
  warn: 1,
  info: 2,
  pass: 3,
}

// ── Row icon ──────────────────────────────────────────────────────────────────

function SeverityIcon({ status }: { status: PolicyCheckStatus }) {
  if (status === 'pass')
    return <Check className="mt-px h-3.5 w-3.5 shrink-0 text-v2-success" strokeWidth={2.25} aria-hidden="true" />
  if (status === 'fail')
    return <X className="mt-px h-3.5 w-3.5 shrink-0 text-v2-danger" strokeWidth={2.25} aria-hidden="true" />
  if (status === 'warn')
    return <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-v2-warning" strokeWidth={2} aria-hidden="true" />
  return <Info className="mt-px h-3.5 w-3.5 shrink-0 text-v2-muted/50" strokeWidth={2} aria-hidden="true" />
}

// ── Inline action map ─────────────────────────────────────────────────────────

function getInlineAction(
  check: Check,
  onTabChange: (t: CompanionTab) => void,
): InlineAction {
  if (check.id === 'tests-missing') {
    return { label: 'Add test →', onClick: () => onTabChange('tests') }
  }
  if (check.id.startsWith('policy-') && check.status === 'fail') {
    return {
      label: 'Open policy →',
      onClick: () => console.warn('TODO: scroll to policy section'),
    }
  }
  if (check.id.startsWith('code-from') && check.status === 'fail') {
    return {
      label: 'Jump to editor →',
      onClick: () => console.warn('TODO: focus FROM clause'),
    }
  }
  return null
}

// ── ValidateTab ───────────────────────────────────────────────────────────────

export function ValidateTab({
  onTabChange,
}: {
  onTabChange: (t: CompanionTab) => void
}) {
  const { code, vault, fieldRefs, destinations, name } = useCompanionContext()

  const codeChecks = buildCodeChecks(code)
  const policyChecks = buildPolicyChecksWithKMin({ fieldRefs, destinations, name, vault })

  // Stable severity sort — insertion order preserved within same severity tier
  const allChecks: Check[] = [...codeChecks, ...policyChecks].sort(
    (a, b) => SEVERITY_ORDER[a.status] - SEVERITY_ORDER[b.status],
  )

  const failCount = allChecks.filter((c) => c.status === 'fail').length
  const isReady = failCount === 0
  const pillText = isReady
    ? 'Ready to submit'
    : `${failCount} issue${failCount !== 1 ? 's' : ''}`

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Header row: pill + submit */}
      <div className="flex items-center justify-between gap-3">
        <span
          data-testid="validate-status-pill"
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-[11px]',
            isReady ? 'text-v2-success' : 'text-v2-warning',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isReady ? 'bg-v2-success' : 'bg-v2-warning',
            )}
            aria-hidden="true"
          />
          {pillText}
        </span>

        <button
          type="button"
          disabled={!isReady}
          title={
            isReady
              ? 'Submit this analysis for review'
              : `Resolve ${failCount} issue${failCount !== 1 ? 's' : ''} before submitting`
          }
          className={cn(
            'rounded-md px-3 py-1.5 font-mono text-[11px] font-medium transition-opacity',
            'bg-v2-foreground text-v2-surface',
            'disabled:cursor-not-allowed disabled:opacity-40',
            'enabled:hover:opacity-90',
          )}
        >
          Submit for review →
        </button>
      </div>

      {/* Problem list */}
      <ul role="list" className="space-y-1.5">
        {allChecks.map((check) => {
          const action = getInlineAction(check, onTabChange)
          return (
            <li
              key={check.id}
              role="listitem"
              className="flex items-start gap-2"
            >
              <span
                data-testid="row-severity"
                data-severity={check.status}
                className="mt-px"
              >
                <SeverityIcon status={check.status} />
              </span>

              <div className="min-w-0 flex-1">
                <span className="font-mono text-[11px] font-medium text-v2-foreground">
                  {check.verb}
                </span>
                <span className="ml-1.5 font-mono text-[10.5px] text-v2-muted">
                  {check.detail}
                </span>
              </div>

              {action && (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="shrink-0 font-mono text-[10px] text-v2-muted transition-colors hover:text-v2-foreground"
                >
                  {action.label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
