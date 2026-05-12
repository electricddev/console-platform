import { DeltaTile } from './delta-tile'
import type { BriefSnapshot } from '@/lib/api/schemas'

const formatUsd = (v: number) => `$${(v / 1e9).toFixed(3)}B`
const formatPp  = (v: number) => `${v.toFixed(2)}%`
const formatLev = (v: number) => `${(v * 100).toFixed(1)}%`
const formatAbs = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${(abs / 1e6).toFixed(1)}M`
  return `$${v.toFixed(0)}`
}

export function VitalSignsPanel({ snapshot }: { snapshot: BriefSnapshot }) {
  const v = snapshot.vitals
  return (
    <section aria-labelledby="vitals">
      <h3 id="vitals" className="font-tag text-foreground/60 mb-3">{'// vital signs · period over period'}</h3>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <DeltaTile label="NAV"                   delta={v.nav}                   formatValue={formatUsd} />
        <DeltaTile label="Leverage"              delta={v.leverage}              formatValue={formatLev} />
        <DeltaTile label="Non-accrual %"         delta={v.nonAccrualPct}         formatValue={formatPp}  />
        <DeltaTile label="Top-10 concentration"  delta={v.top10ConcentrationPct} formatValue={formatPp}  />
        <DeltaTile label="PIK %"                 delta={v.pikPct}                formatValue={formatPp}  />
        <DeltaTile label="Net flow"              delta={v.netFlow}               formatValue={formatAbs} />
      </div>
    </section>
  )
}
