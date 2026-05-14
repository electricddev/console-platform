import type { PipelineFixture } from './pipeline-types'

/**
 * Demo pipeline for Verant Overview — representative of a tokenized
 * private-credit fund (ACRED-style). Times anchor to module-load time so the
 * "ago" and "next" labels read as live during demo without going stale.
 *
 * Hydration note: this file is imported by a `'use client'` page, so the
 * SSR/client time difference reduces to a few-millisecond delta in computed
 * ISO strings — not enough to cause a visible mismatch.
 */
const NOW = Date.now()
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const minutesAhead = (m: number) => new Date(NOW + m * 60_000).toISOString()

function fmtUtcHm(t: number): string {
  const d = new Date(t)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`
}

export const overviewPipeline: PipelineFixture = {
  kpi: {
    totalNav: '$1,247,318,402',
    navPerShare: '$103.4719',
    sharesOutstanding: '12,055,401',
    nextPublishAt: minutesAhead(37),
    asOfLabel: `as of ${fmtUtcHm(NOW)}`,
  },

  nodes: [
    // ── sources (column 0) ───────────────────────────────────────────
    {
      id: 'src-custodian',
      data: {
        label: 'Custodian holdings',
        phase: 'source',
        status: 'attested',
        cadence: 'daily · 13:00 UTC',
        lastRunAt: minutesAgo(83),
        nextRunAt: minutesAhead(1357),
        description:
          'Position-level holdings feed from BNY Mellon, ingested via SFTP with TLSNotary proof of provenance.',
        inputs: [
          { label: 'feed', value: 'bny.holdings.daily.v3' },
          { label: 'records', value: '8,412 positions' },
        ],
        output: { label: 'snapshot', value: 'holdings@2026-05-14' },
        provenance: {
          signingKey: 'kid:bny.0x7af3',
          proofType: 'tlsnotary',
          reference: '0x9c3a…f7b1',
        },
      },
    },
    {
      id: 'src-prices',
      data: {
        label: 'Market prices',
        phase: 'source',
        status: 'attested',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(7),
        nextRunAt: minutesAhead(8),
        description:
          'Refinitiv institutional pricing feed, fixed-income spreads at mid. Pulled every 15 minutes during market hours.',
        inputs: [
          { label: 'feed', value: 'refinitiv.fi.mid' },
          { label: 'instruments', value: '1,204 cusips' },
        ],
        output: { label: 'pricebook', value: 'prices@14:15:00Z' },
        provenance: {
          signingKey: 'kid:refinitiv.0x4d18',
          proofType: 'ed25519',
          reference: '0x1eaa…3c92',
        },
      },
    },
    {
      id: 'src-fx',
      data: {
        label: 'FX rates',
        phase: 'source',
        status: 'attested',
        cadence: 'every 5m',
        lastRunAt: minutesAgo(2),
        nextRunAt: minutesAhead(3),
        description: 'WM/Refinitiv 4pm London fix, intra-day rates via direct feed.',
        inputs: [
          { label: 'feed', value: 'wmrefi.fx.spot' },
          { label: 'pairs', value: '38 crosses' },
        ],
        output: { label: 'rates', value: 'fx@14:21:00Z' },
        provenance: {
          signingKey: 'kid:wmrefi.0x2bf0',
          proofType: 'ed25519',
          reference: '0x4f17…2e83',
        },
      },
    },
    {
      id: 'src-trades',
      data: {
        label: 'Trade blotter',
        phase: 'source',
        status: 'pending',
        cadence: 'real-time',
        lastRunAt: minutesAgo(0),
        nextRunAt: minutesAhead(0),
        description:
          'OMS trade stream over Kafka. Two trades pending T+0 reconciliation against custodian confirms.',
        inputs: [
          { label: 'stream', value: 'oms.trades.v2' },
          { label: 'pending', value: '2 unmatched' },
        ],
        output: { label: 'eod-blotter', value: '— (pending)' },
        provenance: {
          signingKey: 'kid:oms.0xa401',
          proofType: 'ed25519',
          reference: '— (in flight)',
        },
      },
    },

    // ── validation (column 1) ────────────────────────────────────────
    {
      id: 'val-schema',
      data: {
        label: 'Schema validator',
        phase: 'validate',
        status: 'attested',
        cadence: 'on ingest',
        lastRunAt: minutesAgo(2),
        nextRunAt: minutesAhead(3),
        description:
          'Zod schemas + signed schema-version pinning. Rejects any record that fails the published v3 contract.',
        inputs: [
          { label: 'sources', value: '4 upstream feeds' },
          { label: 'schema', value: 'fund.acred.v3.7' },
        ],
        output: { label: 'verdict', value: '8,410 / 8,412 passed' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'merkle-anchor',
          reference: '0xb5d1…a3fc',
        },
      },
    },
    {
      id: 'val-recon',
      data: {
        label: 'Reconciliation',
        phase: 'validate',
        status: 'pending',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(11),
        nextRunAt: minutesAhead(4),
        description:
          'Three-way recon between custodian holdings, OMS trade blotter, and last-published shadow NAV. Two breaks open.',
        inputs: [
          { label: 'holdings', value: '8,410 positions' },
          { label: 'blotter', value: '2,108 trades' },
        ],
        output: { label: 'breaks', value: '2 open · $4,217 net' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'merkle-anchor',
          reference: '0xee92…018b',
        },
      },
    },

    // ── valuation (column 2) ─────────────────────────────────────────
    {
      id: 'val-position',
      data: {
        label: 'Position valuation',
        phase: 'value',
        status: 'attested',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(6),
        nextRunAt: minutesAhead(9),
        description:
          'Multiplies holdings × prices × fx → USD per-position value. Cross-checked against shadow book.',
        inputs: [
          { label: 'holdings', value: '8,410 positions' },
          { label: 'prices', value: 'pricebook@14:15Z' },
          { label: 'fx', value: 'rates@14:21Z' },
        ],
        output: { label: 'positions', value: '$1,228,041,116' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0x4a01…7d62',
        },
      },
    },
    {
      id: 'val-accrued',
      data: {
        label: 'Accrued income',
        phase: 'value',
        status: 'attested',
        cadence: 'daily',
        lastRunAt: minutesAgo(120),
        nextRunAt: minutesAhead(1320),
        description:
          'Day-count interest accruals for fixed-income holdings, including PIK and step-up paper.',
        inputs: [
          { label: 'positions', value: '8,410 positions' },
          { label: 'asof', value: '2026-05-14' },
        ],
        output: { label: 'accrued', value: '$22,803,109' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0x91bd…40e8',
        },
      },
    },
    {
      id: 'val-fees',
      data: {
        label: 'Fee accrual',
        phase: 'value',
        status: 'attested',
        cadence: 'daily',
        lastRunAt: minutesAgo(120),
        nextRunAt: minutesAhead(1320),
        description: 'Management + performance fee accrual against published schedule.',
        inputs: [
          { label: 'gav-prior', value: '$1,228m' },
          { label: 'schedule', value: 'mgmt 0.85% · perf 15/8' },
        ],
        output: { label: 'fee-liab', value: '$3,525,823' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0x2c01…f199',
        },
      },
    },

    // ── aggregation (column 3) ──────────────────────────────────────
    {
      id: 'agg-gav',
      data: {
        label: 'Gross asset value',
        phase: 'aggregate',
        status: 'attested',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(5),
        nextRunAt: minutesAhead(10),
        description: 'Sum of position values + accrued income + cash & equivalents.',
        inputs: [
          { label: 'positions', value: '$1,228,041,116' },
          { label: 'accrued', value: '$22,803,109' },
        ],
        output: { label: 'gav', value: '$1,250,844,225' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0x6712…b104',
        },
      },
    },
    {
      id: 'agg-nav',
      data: {
        label: 'Total NAV',
        phase: 'aggregate',
        status: 'attested',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(4),
        nextRunAt: minutesAhead(11),
        description: 'GAV − accrued fee liability − pending redemptions.',
        inputs: [
          { label: 'gav', value: '$1,250,844,225' },
          { label: 'fee-liab', value: '$3,525,823' },
        ],
        output: { label: 'nav', value: '$1,247,318,402' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0x88a2…d710',
        },
      },
    },

    // ── publish (column 4) ──────────────────────────────────────────
    {
      id: 'pub-pershare',
      data: {
        label: 'NAV per share',
        phase: 'publish',
        status: 'attested',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(3),
        nextRunAt: minutesAhead(12),
        description: 'NAV ÷ shares outstanding, rounded to 4dp per offering documents.',
        inputs: [
          { label: 'nav', value: '$1,247,318,402' },
          { label: 'shares', value: '12,055,401' },
        ],
        output: { label: 'nav/sh', value: '$103.4719' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'kzg',
          reference: '0xfa01…4287',
        },
      },
    },
    {
      id: 'pub-attest',
      data: {
        label: 'Attested publish',
        phase: 'publish',
        status: 'pending',
        cadence: 'every 15m',
        lastRunAt: minutesAgo(18),
        nextRunAt: minutesAhead(37),
        description:
          'Final attestation, signed bundle anchored on-chain. Held pending reconciliation breaks resolution.',
        inputs: [
          { label: 'nav',    value: '$1,247,318,402' },
          { label: 'nav/sh', value: '$103.4719' },
          { label: 'breaks', value: '2 open' },
        ],
        output: { label: 'tx', value: '— (held)' },
        provenance: {
          signingKey: 'kid:verant.0xc9e2',
          proofType: 'merkle-anchor',
          reference: 'awaiting attestation',
        },
        consumerDeliveries: [
          { name: 'Morpho', network: 'mainnet', lastDeliveryAt: minutesAgo(3), payloadRef: '0xa412…b8de' },
          { name: 'Gauntlet', network: 'mainnet', lastDeliveryAt: minutesAgo(3), payloadRef: '0xb73c…f201' },
          { name: 'RedStone', network: 'oracle', lastDeliveryAt: minutesAgo(3), payloadRef: '0x8e1a…2c97' },
        ],
      },
    },
  ],

  edges: [
    // sources → schema validator
    { id: 'e1', source: 'src-custodian', target: 'val-schema' },
    { id: 'e2', source: 'src-prices', target: 'val-schema' },
    { id: 'e3', source: 'src-fx', target: 'val-schema' },
    { id: 'e4', source: 'src-trades', target: 'val-schema' },
    // schema → recon → valuations
    { id: 'e5', source: 'val-schema', target: 'val-recon' },
    { id: 'e6', source: 'val-recon', target: 'val-position' },
    // valuations branch
    { id: 'e7', source: 'val-position', target: 'val-accrued' },
    { id: 'e8', source: 'val-position', target: 'agg-gav' },
    { id: 'e9', source: 'val-accrued', target: 'agg-gav' },
    { id: 'e10', source: 'val-position', target: 'val-fees' },
    // agg
    { id: 'e11', source: 'agg-gav', target: 'agg-nav' },
    { id: 'e12', source: 'val-fees', target: 'agg-nav' },
    // publish
    { id: 'e13', source: 'agg-nav', target: 'pub-pershare' },
    { id: 'e14', source: 'pub-pershare', target: 'pub-attest' },
  ],

  attention: [
    {
      kind: 'counterparty_request',
      label: 'Aave V4 requesting NAV access',
      detail: 'mainnet · 25k TVL committed',
      at: minutesAgo(67),
      href: '/v2/counterparties',
    },
    {
      kind: 'rule_fire',
      label: 'NAV move > 0.5% intraday',
      detail: '+0.62% from prior publish',
      at: minutesAgo(28),
      href: '/v2/alerts',
    },
  ],
}
