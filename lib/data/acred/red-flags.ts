import type { BriefSnapshot, RedFlag } from '@/lib/api/schemas'
import { acredFacts } from './facts'
import { acredAnomalyFeed } from './anomalies'

type Facts = typeof acredFacts

export type RedFlagRule = {
  id: string
  label: string
  severity: RedFlag['severity']
  /** Pure: never throws (the evaluator wraps for safety anyway). */
  evaluate: (s: BriefSnapshot, f: Facts) => null | { reason: string; drillHref: string | null }
}

const baseHref = '/datasets/ds_acred'

export const acredRedFlagRules: RedFlagRule[] = [
  {
    id: 'acred.non_accrual_rising',
    label: 'Non-accrual % rose QoQ',
    severity: 'medium',
    evaluate: (s, f) => s.vitals.nonAccrualPct.delta > 0.20
      ? {
          reason: `+${s.vitals.nonAccrualPct.delta.toFixed(2)}pp QoQ — ${f.flaggedHoldings.nonAccrual} holdings on non-accrual`,
          drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue`,
        }
      : null,
  },
  {
    id: 'acred.non_accrual_high',
    label: 'Non-accrual % above 1.5%',
    severity: 'high',
    evaluate: (s) => s.vitals.nonAccrualPct.value >= 1.5
      ? { reason: `Currently ${s.vitals.nonAccrualPct.value.toFixed(2)}%`, drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue` }
      : null,
  },
  {
    id: 'acred.leverage_drift',
    label: 'Leverage moved > 200bps QoQ',
    severity: 'medium',
    evaluate: (s) => Math.abs(s.vitals.leverage.delta) > 2.0
      ? { reason: `${s.vitals.leverage.delta.toFixed(2)}pp QoQ`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.leverage_high',
    label: 'Leverage above 75%',
    severity: 'high',
    evaluate: (s) => s.vitals.leverage.value > 0.75
      ? { reason: `Currently ${(s.vitals.leverage.value * 100).toFixed(1)}%`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.top10_drift',
    label: 'Top-10 concentration drifted > 200bps',
    severity: 'medium',
    evaluate: (s) => Math.abs(s.vitals.top10ConcentrationPct.delta) > 2.0
      ? { reason: `${s.vitals.top10ConcentrationPct.delta > 0 ? '+' : ''}${s.vitals.top10ConcentrationPct.delta.toFixed(1)}pp QoQ`, drillHref: `${baseHref}/explore?table=concentration_metrics` }
      : null,
  },
  {
    id: 'acred.industry_concentration',
    label: 'Single industry > 25%',
    severity: 'medium',
    evaluate: (_s, f) => f.flaggedHoldings.softwareIndustry > 0
      ? { reason: `Software industry holds ${f.flaggedHoldings.softwareIndustry} positions`, drillHref: `${baseHref}/explore?table=holdings&where=industry%3D%27Software%27` }
      : null,
  },
  {
    id: 'acred.pik_rising',
    label: 'PIK % rose QoQ or above 8%',
    severity: 'medium',
    evaluate: (s, f) => (s.vitals.pikPct.delta > 1.0 || s.vitals.pikPct.value > 8.0)
      ? { reason: `${s.vitals.pikPct.value.toFixed(1)}% (${s.vitals.pikPct.delta > 0 ? '+' : ''}${s.vitals.pikPct.delta.toFixed(1)}pp QoQ) — ${f.flaggedHoldings.pik} PIK positions`, drillHref: `${baseHref}/explore?table=holdings&where=coupon_kind%3D%27pik%27` }
      : null,
  },
  {
    id: 'acred.recent_high_severity_event',
    label: 'New high-severity 8-K linked to held borrower (30d)',
    severity: 'high',
    evaluate: () => {
      const cutoff = Date.now() - 30 * 24 * 3_600_000
      const hit = acredAnomalyFeed.find((e) =>
        e.kind === 'credit-event' &&
        e.severity === 'high' &&
        new Date(e.occurredAt).getTime() >= cutoff,
      )
      return hit
        ? { reason: `${hit.title} — ${hit.borrowerNormalized}`, drillHref: hit.detailHref }
        : null
    },
  },
]

export function evaluateAcredRedFlags(snapshot: BriefSnapshot, facts: Facts): RedFlag[] {
  const out: RedFlag[] = []
  for (const rule of acredRedFlagRules) {
    try {
      const result = rule.evaluate(snapshot, facts)
      if (result) {
        out.push({
          id: rule.id, label: rule.label, severity: rule.severity,
          reason: result.reason, drillHref: result.drillHref,
        })
      }
    } catch (err) {
      // One broken rule must not break the scoreboard.
      console.error(`[red-flag] ${rule.id} threw:`, err)
    }
  }
  return out
}
