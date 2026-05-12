import type { BriefSnapshot, RedFlag, Threshold } from '@/lib/api/schemas'
import { acredFacts } from './facts'
import { acredAnomalyFeed } from './anomalies'

type Facts = typeof acredFacts

export type RedFlagRule = {
  id: string
  label: string
  severity: RedFlag['severity']
  /** Optional metric key for the threshold slider; rules without an override are not slider-eligible. */
  thresholdMetric?: string
  defaultThreshold?: number
  evaluate:
    | ((s: BriefSnapshot, f: Facts) => null | { reason: string; drillHref: string | null })
    | ((s: BriefSnapshot, f: Facts, threshold: number) => null | { reason: string; drillHref: string | null })
}

const baseHref = '/datasets/ds_acred'

export const acredRedFlagRules: RedFlagRule[] = [
  {
    id: 'acred.non_accrual_rising',
    label: 'Non-accrual % rose QoQ',
    severity: 'medium',
    thresholdMetric: 'non_accrual_delta',
    defaultThreshold: 0.20,
    evaluate: (s, f, threshold) => s.vitals.nonAccrualPct.delta > threshold
      ? {
          reason: `+${s.vitals.nonAccrualPct.delta.toFixed(2)}pp QoQ — ${f.flaggedHoldings.nonAccrual} holdings on non-accrual`,
          drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue`,
        }
      : null,
  },
  {
    id: 'acred.non_accrual_high',
    label: 'Non-accrual % above threshold',
    severity: 'high',
    thresholdMetric: 'non_accrual',
    defaultThreshold: 1.5,
    evaluate: (s, _f, threshold) => s.vitals.nonAccrualPct.value >= threshold
      ? { reason: `Currently ${s.vitals.nonAccrualPct.value.toFixed(2)}%`, drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue` }
      : null,
  },
  {
    id: 'acred.leverage_drift',
    label: 'Leverage moved beyond threshold QoQ',
    severity: 'medium',
    thresholdMetric: 'leverage_delta',
    defaultThreshold: 2.0,
    evaluate: (s, _f, threshold) => Math.abs(s.vitals.leverage.delta) > threshold
      ? { reason: `${s.vitals.leverage.delta.toFixed(2)}pp QoQ`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.leverage_high',
    label: 'Leverage above threshold',
    severity: 'high',
    thresholdMetric: 'leverage',
    defaultThreshold: 0.75,
    evaluate: (s, _f, threshold) => s.vitals.leverage.value > threshold
      ? { reason: `Currently ${(s.vitals.leverage.value * 100).toFixed(1)}%`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.top10_drift',
    label: 'Top-10 concentration drifted beyond threshold',
    severity: 'medium',
    thresholdMetric: 'top10_delta',
    defaultThreshold: 2.0,
    evaluate: (s, _f, threshold) => Math.abs(s.vitals.top10ConcentrationPct.delta) > threshold
      ? { reason: `${s.vitals.top10ConcentrationPct.delta > 0 ? '+' : ''}${s.vitals.top10ConcentrationPct.delta.toFixed(1)}pp QoQ`, drillHref: `${baseHref}/explore?table=concentration_metrics` }
      : null,
  },
  {
    id: 'acred.industry_concentration',
    label: 'Single industry > 25%',
    severity: 'medium',
    evaluate: (_s: BriefSnapshot, f: Facts) => f.flaggedHoldings.softwareIndustry > 0
      ? { reason: `Software industry holds ${f.flaggedHoldings.softwareIndustry} positions`, drillHref: `${baseHref}/explore?table=holdings&where=industry%3D%27Software%27` }
      : null,
  },
  {
    id: 'acred.pik_rising',
    label: 'PIK % above threshold',
    severity: 'medium',
    thresholdMetric: 'pik',
    defaultThreshold: 8.0,
    evaluate: (s, f, threshold) => (s.vitals.pikPct.value > threshold)
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

export function evaluateAcredRedFlags(
  snapshot: BriefSnapshot,
  facts: Facts,
  thresholds: Threshold[] = [],
): RedFlag[] {
  const out: RedFlag[] = []
  for (const rule of acredRedFlagRules) {
    try {
      const override = thresholds.find((t) => t.ruleId === rule.id && t.datasetId === 'ds_acred')
      const useThreshold = override?.value ?? rule.defaultThreshold ?? 0
      const result = (rule.evaluate.length === 3)
        ? (rule.evaluate as (s: BriefSnapshot, f: Facts, t: number) => null | { reason: string; drillHref: string | null })(snapshot, facts, useThreshold)
        : (rule.evaluate as (s: BriefSnapshot, f: Facts) => null | { reason: string; drillHref: string | null })(snapshot, facts)
      if (result) {
        out.push({
          id: rule.id, label: rule.label, severity: rule.severity,
          reason: result.reason, drillHref: result.drillHref,
        })
      }
    } catch (err) {
      console.error(`[red-flag] ${rule.id} threw:`, err)
    }
  }
  return out
}
