'use client'
import { useState } from 'react'
import { useCompanionContext } from './companion-context'
import { ExecutionTimeline } from './execution-timeline'
import { CostBars, type CostRow } from './cost-bars'
import {
  getNextCronExecutions,
  countCronExecutionsIn30Days,
  COMPUTE_COST_PER_EXEC,
  GAS_PER_WRITE,
} from '@/components/v2/features/cp/analysis-workbench'

export function ScheduleTab() {
  const { triggerKind, cronExpr, eventSource, onchainDests } = useCompanionContext()
  const NOW = new Date()
  const nextExecutions = triggerKind === 'cron' ? getNextCronExecutions(cronExpr, NOW, 5) : null

  const gasPerExec = onchainDests.reduce((sum, d) => sum + (GAS_PER_WRITE[d.chain] ?? 0), 0)
  const totalCostPerExec = COMPUTE_COST_PER_EXEC + gasPerExec
  const runsIn30Days = triggerKind === 'cron' ? (countCronExecutionsIn30Days(cronExpr) ?? 0) : 0
  const runsPerDay = runsIn30Days / 30
  const monthlyCost = runsIn30Days * totalCostPerExec
  const dailyCost = runsPerDay * totalCostPerExec

  const [budgetCap, setBudgetCap] = useState<string>('50')
  const [budgetPeriod, setBudgetPeriod] = useState<'month' | 'day'>('month')
  const [alertOn, setAlertOn] = useState(true)
  const capNum = parseFloat(budgetCap) || 0
  const compare = budgetPeriod === 'month' ? monthlyCost : dailyCost
  const overBudget = compare > capNum
  const nearBudget = !overBudget && compare > capNum * 0.8

  const costRows: CostRow[] = [
    { label: 'Compute', amount: COMPUTE_COST_PER_EXEC },
    ...onchainDests.map((d) => ({
      label: `${d.chain} gas · ${d.label || d.address.slice(0, 8) + '…'}`,
      amount: GAS_PER_WRITE[d.chain] ?? 0,
    })),
  ]

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Trigger summary */}
      <div className="space-y-1">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Trigger</p>
        <p className="font-mono text-[11px] text-v2-foreground">
          {triggerKind === 'cron' ? <><span>cron · </span><code className="text-v2-muted">{cronExpr}</code></>
            : triggerKind === 'event' ? <>event · {eventSource || '(none)'}</>
            : 'manual · on demand'}
        </p>
      </div>

      <ExecutionTimeline executions={nextExecutions} mode={triggerKind} eventSource={eventSource} />

      {/* Cost cards */}
      <div className="grid grid-cols-3 gap-2 border-t border-v2-border/60 pt-3">
        <div className="rounded-lg border border-v2-border/60 px-3 py-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Per execution</p>
          <p className="mt-1 font-mono text-[14px] tabular-nums text-v2-foreground">${totalCostPerExec.toFixed(4)}</p>
        </div>
        <div className="rounded-lg border border-v2-border/60 px-3 py-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Per day</p>
          <p className="mt-1 font-mono text-[14px] tabular-nums text-v2-foreground">${dailyCost.toFixed(2)}</p>
          <p className="font-mono text-[9px] tabular-nums text-v2-muted">{runsPerDay.toFixed(1)} runs</p>
        </div>
        <div className="rounded-lg border border-v2-border/60 px-3 py-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Per month</p>
          <p className="mt-1 font-mono text-[14px] tabular-nums text-v2-foreground">${monthlyCost.toFixed(2)}</p>
          <p className="font-mono text-[9px] tabular-nums text-v2-muted">{runsIn30Days.toLocaleString()} runs</p>
        </div>
      </div>

      {/* Cost bars */}
      {onchainDests.length === 0 ? (
        <p className="font-mono text-[10.5px] text-v2-muted">
          Add an on-chain destination to break down gas costs.
        </p>
      ) : (
        <CostBars rows={costRows} />
      )}

      {/* Budget cap */}
      <div className="space-y-2 border-t border-v2-border/60 pt-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Budget cap</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-v2-muted">$</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={budgetCap}
            onChange={(e) => setBudgetCap(e.target.value)}
            aria-label="Budget cap amount"
            className="w-20 rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-v2-foreground"
          />
          <select
            value={budgetPeriod}
            onChange={(e) => setBudgetPeriod(e.target.value as 'month' | 'day')}
            aria-label="Budget period"
            className="rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground"
          >
            <option value="month">/ month</option>
            <option value="day">/ day</option>
          </select>
          <label className="ml-2 inline-flex items-center gap-1 font-mono text-[10.5px] text-v2-muted">
            <input type="checkbox" checked={alertOn} onChange={(e) => setAlertOn(e.target.checked)} />
            Alert at 80%
          </label>
        </div>
        {overBudget && (
          <p className="font-mono text-[10.5px] text-v2-danger">
            Projected ${compare.toFixed(2)} / {budgetPeriod} exceeds cap.
          </p>
        )}
        {nearBudget && alertOn && (
          <p className="font-mono text-[10.5px] text-v2-warning">
            Projected ${compare.toFixed(2)} / {budgetPeriod} is within 80% of cap.
          </p>
        )}
        <p className="font-mono text-[9.5px] text-v2-muted">
          Cost estimates are illustrative — actual gas varies with network conditions.
        </p>
      </div>
    </div>
  )
}
