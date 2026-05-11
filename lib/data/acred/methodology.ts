import type { Methodology } from '../methodology'

export const acredMethodology: Methodology[] = [
  // 1. NAV trend (time-series)
  {
    id: 'acred.nav_trend',
    title: 'NAV over time',
    description: 'Net asset value at each snapshot date.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(period_end_date, '%Y-%m-01') AS period, total_nav AS value
          FROM fund_overview
          ORDER BY period_end_date`,
  },

  // 2. Net capital flow over time (time-series)
  // Substitution: plan proposed "weighted_avg_coupon current vs 12mo ago" (comparison)
  // but fund_overview has no coupon column. Using net capital flow instead — same axis
  // (time), same shape (time-series), and directly available from monthly_flow_net.
  {
    id: 'acred.net_flow_over_time',
    title: 'Net capital flow over time',
    description: 'Monthly net capital flow (subscriptions minus redemptions) per reporting period.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(period_end_date, '%Y-%m-01') AS period,
                 monthly_flow_net AS value
          FROM fund_overview
          ORDER BY period_end_date`,
  },

  // 3. Top-10 borrowers (breakdown)
  {
    id: 'acred.top10_borrowers',
    title: 'Top-10 borrower exposure',
    description: 'Top 10 obligors by fair value in the most recent snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT borrower_normalized AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY borrower_normalized
          ORDER BY value DESC
          LIMIT 10`,
  },

  // 4. Sector mix (breakdown)
  {
    id: 'acred.sector_mix',
    title: 'Exposure by industry sector',
    description: 'Fair value share by primary industry in the most recent snapshot.',
    axis: 'segment',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT coalesce(nullif(industry, ''), 'Unknown') AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY value DESC
          LIMIT 10`,
  },

  // 5. Geo mix (breakdown)
  {
    id: 'acred.geo_mix',
    title: 'Exposure by geography',
    description: 'Fair value share by issuer geography in the most recent snapshot.',
    axis: 'segment',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT coalesce(nullif(geography, ''), 'Unknown') AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY value DESC
          LIMIT 10`,
  },

  // 6. Coupon type mix (breakdown)
  // Substitution: plan proposed "rating mix" using a holdings.rating column that does
  // not exist in the descriptor. Replaced with coupon_kind distribution, which covers
  // a structurally equivalent breakdown and uses the real coupon_kind column.
  {
    id: 'acred.coupon_kind_mix',
    title: 'Coupon type distribution',
    description: 'Fair value by coupon kind (floating / fixed / PIK / zero) in the most recent snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT coalesce(nullif(coupon_kind, ''), 'Unknown') AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY value DESC`,
  },

  // 7. Maturity profile (breakdown)
  // Using days_to_maturity (pre-computed integer) instead of date arithmetic on
  // maturity_date, which avoids DuckDB date_diff dialect concerns and uses a real column.
  {
    id: 'acred.maturity_profile',
    title: 'Maturity buckets',
    description: 'Fair value bucketed by years to maturity from the latest snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings),
          bucketed AS (
            SELECT fair_value,
              CASE
                WHEN days_to_maturity IS NULL THEN 'No maturity'
                WHEN days_to_maturity <= 365  THEN '0–1y'
                WHEN days_to_maturity <= 1095 THEN '1–3y'
                WHEN days_to_maturity <= 1825 THEN '3–5y'
                ELSE '5y+'
              END AS label
            FROM holdings, latest
            WHERE period_end_date = latest.d
          )
          SELECT label, SUM(fair_value) AS value
          FROM bucketed
          GROUP BY label
          ORDER BY label`,
  },

  // 8. Non-accrual % over time (time-series)
  // Substitution: plan proposed "watchlist % using holdings.rating IN ('CCC','CC','C','D')"
  // but holdings has no rating column. Replaced with non-accrual % over time, which is
  // a structurally equivalent stress-indicator time-series using fund_overview.non_accrual_value_pct.
  {
    id: 'acred.non_accrual_pct_over_time',
    title: 'Non-accrual % of book over time',
    description: 'Share of fair value on non-accrual status per reporting period.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(period_end_date, '%Y-%m-01') AS period,
                 non_accrual_value_pct AS value
          FROM fund_overview
          ORDER BY period_end_date`,
  },

  // 9. Event frequency by month (time-series)
  {
    id: 'acred.event_frequency_by_month',
    title: 'Credit event count by month',
    description: 'Number of credit events disclosed per month.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(date_trunc('month', event_date), '%Y-%m-01') AS period,
                 COUNT(*) AS value
          FROM credit_events
          GROUP BY period
          ORDER BY period`,
  },

  // 10. Event severity mix (breakdown)
  {
    id: 'acred.event_severity_mix',
    title: 'Credit event severity mix',
    description: 'Total credit events by severity (low / medium / high).',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `SELECT severity AS label, COUNT(*) AS value
          FROM credit_events
          WHERE severity IS NOT NULL
          GROUP BY severity
          ORDER BY label`,
  },

  // 11. First-lien % (metric)
  {
    id: 'acred.first_lien_pct',
    title: 'First-lien % of book',
    description: 'Most recent snapshot percentage of first-lien positions by fair value.',
    axis: 'snapshot',
    shape: 'metric',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM concentration_metrics)
          SELECT pct_first_lien AS value
          FROM concentration_metrics, latest
          WHERE period_end_date = latest.d`,
  },

  // 12. Top-10 concentration % (metric)
  // Substitution: plan proposed "HHI concentration" using concentration_metrics.hhi which
  // does not exist in the descriptor. Replaced with top_10_concentration_pct, an equivalent
  // concentration metric that is directly available in the same table.
  {
    id: 'acred.top10_concentration_pct',
    title: 'Top-10 concentration % (current)',
    description: 'Percentage of portfolio fair value held in the top 10 borrowers at the most recent snapshot.',
    axis: 'snapshot',
    shape: 'metric',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM concentration_metrics)
          SELECT top_10_concentration_pct AS value
          FROM concentration_metrics, latest
          WHERE period_end_date = latest.d`,
  },
]
