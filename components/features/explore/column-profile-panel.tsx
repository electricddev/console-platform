'use client'

import { fmtNumber } from '@/lib/format'
import { formatValue } from '@/lib/data/format'
import type { ColumnFilter, ResolvedColumn } from '@/lib/data/types'
import { useColumnProfile } from '@/lib/data/use-column-profile'
import { ProfileChartHistogram } from './profile-chart-histogram'
import { ProfileChartCategorical } from './profile-chart-categorical'
import { ProfileChartTimeline } from './profile-chart-timeline'

type Props = {
  tableId: string
  column: ResolvedColumn | null
  filters: ColumnFilter[]
}

export function ColumnProfilePanel({ tableId, column, filters }: Props) {
  const state = useColumnProfile(tableId, column, filters)

  return (
    <aside className="hidden md:grid gap-3 rounded-lg border border-border bg-surface/40 p-3 text-sm">
      {!column ? (
        <p className="text-muted-foreground">Select a column to profile.</p>
      ) : (
        <>
          <div>
            <div className="font-medium">{column.label}</div>
            <div className="font-mono text-xs text-muted-foreground">{column.duckdbType} · {column.format}</div>
            {column.description && <p className="mt-1 text-xs text-muted-foreground">{column.description}</p>}
          </div>

          {!state.ready ? (
            <p className="text-xs text-muted-foreground">{state.error ? `Error: ${state.error.message}` : 'Profiling…'}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Distinct</dt>
                <dd className="font-mono">{fmtNumber(state.profile.distinct)}</dd>
                <dt className="text-muted-foreground">Nulls</dt>
                <dd className="font-mono">{fmtNumber(state.profile.nullCount)}</dd>
                {state.profile.kind === 'numeric' && (
                  <>
                    <dt className="text-muted-foreground">Min</dt>
                    <dd className="font-mono">{formatValue(state.profile.min, column)}</dd>
                    <dt className="text-muted-foreground">Max</dt>
                    <dd className="font-mono">{formatValue(state.profile.max, column)}</dd>
                  </>
                )}
              </dl>
              {state.profile.kind === 'numeric' && state.profile.bins.length > 0 && (
                <ProfileChartHistogram bins={state.profile.bins} formatTick={(v) => formatValue(v, column)} />
              )}
              {state.profile.kind === 'categorical' && (
                <ProfileChartCategorical top={state.profile.top} />
              )}
              {state.profile.kind === 'timeline' && state.profile.buckets.length > 0 && (
                <ProfileChartTimeline buckets={state.profile.buckets} />
              )}
              {state.profile.kind === 'simple' && state.profile.topValue && (
                <p className="text-xs text-muted-foreground">Most common: <span className="font-mono">{state.profile.topValue}</span></p>
              )}
            </>
          )}
        </>
      )}
    </aside>
  )
}
