// components/v2/features/sources/add-source-modal/sample-rows.ts

export type SampleRow = Record<string, string>

export type SamplePreview =
  | { kind: 'tabular'; columns: string[]; rows: SampleRow[] }
  | { kind: 'objects'; items: Array<{ name: string; size: string; modified: string }> }

const SAMPLES: Record<string, SamplePreview> = {
  // Stripe
  'stripe:charges': {
    kind: 'tabular',
    columns: ['id', 'amount', 'currency', 'customer', 'status', 'created'],
    rows: [
      { id: 'ch_3Q••••AT', amount: '12,400', currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:02:11Z' },
      { id: 'ch_3Q••••AU', amount: '4,200',  currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:07:08Z' },
      { id: 'ch_3Q••••AV', amount: '88,750', currency: 'usd', customer: 'cus_••••••', status: 'refunded',  created: '2026-05-23T14:18:32Z' },
      { id: 'ch_3Q••••AW', amount: '1,150',  currency: 'eur', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:24:07Z' },
      { id: 'ch_3Q••••AX', amount: '210,000',currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:29:51Z' },
    ],
  },
  'stripe:invoices': {
    kind: 'tabular',
    columns: ['id', 'customer', 'total', 'currency', 'status', 'period'],
    rows: [
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '120,000', currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '47,500',  currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '8,200',   currency: 'usd', status: 'open',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '92,000',  currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '610,000', currency: 'usd', status: 'uncollectible', period: '2026-04' },
    ],
  },
  'stripe:customers': {
    kind: 'tabular',
    columns: ['id', 'email', 'name', 'created', 'total_lifetime'],
    rows: [
      { id: 'cus_PA••••', email: '•••@aurora.fund', name: 'Aurora Capital LP',    created: '2024-11-12', total_lifetime: '4,820,000' },
      { id: 'cus_PB••••', email: '•••@steady.bk',  name: 'Steady Bank',           created: '2025-02-04', total_lifetime: '1,107,000' },
      { id: 'cus_PC••••', email: '•••@orchid.io',  name: 'Orchid Holdings',       created: '2025-04-21', total_lifetime: '218,400' },
      { id: 'cus_PD••••', email: '•••@cliff.lp',   name: 'Cliffside Partners',    created: '2025-06-30', total_lifetime: '92,150' },
      { id: 'cus_PE••••', email: '•••@halo.fi',    name: 'Halo Financial',        created: '2025-09-11', total_lifetime: '12,800' },
    ],
  },

  // Plaid
  'plaid:transactions': {
    kind: 'tabular',
    columns: ['id', 'account', 'amount', 'name', 'category', 'date'],
    rows: [
      { id: 'tx_AA••••', account: '••••2487', amount: '-12,400', name: 'AURORA CAPITAL DRAW', category: 'Transfer', date: '2026-05-23' },
      { id: 'tx_AB••••', account: '••••2487', amount: '-4,200',  name: 'WIRE TO STEADY BANK', category: 'Transfer', date: '2026-05-23' },
      { id: 'tx_AC••••', account: '••••2487', amount: '880,000', name: 'INBOUND ACH FACILITY', category: 'Transfer', date: '2026-05-22' },
      { id: 'tx_AD••••', account: '••••2487', amount: '-95,000', name: 'SERVICE FEE',          category: 'Fee',      date: '2026-05-22' },
      { id: 'tx_AE••••', account: '••••2487', amount: '-2,400',  name: 'OUTBOUND WIRE',        category: 'Transfer', date: '2026-05-22' },
    ],
  },
  'plaid:balances': {
    kind: 'tabular',
    columns: ['account', 'available', 'current', 'limit', 'iso_currency'],
    rows: [
      { account: '••••2487', available: '4,212,890', current: '4,212,890', limit: '—', iso_currency: 'USD' },
      { account: '••••8841', available: '0',         current: '0',         limit: '5,000,000', iso_currency: 'USD' },
    ],
  },

  // QuickBooks
  'quickbooks:invoices': {
    kind: 'tabular',
    columns: ['id', 'doc_number', 'customer', 'total', 'currency', 'balance', 'due'],
    rows: [
      { id: 'inv_AA', doc_number: '2026-0148', customer: 'Aurora Capital',  total: '120,000', currency: 'USD', balance: '0',       due: '2026-05-30' },
      { id: 'inv_AB', doc_number: '2026-0149', customer: 'Steady Bank',     total: '47,500',  currency: 'USD', balance: '0',       due: '2026-06-04' },
      { id: 'inv_AC', doc_number: '2026-0150', customer: 'Orchid Holdings', total: '8,200',   currency: 'USD', balance: '8,200',   due: '2026-06-12' },
      { id: 'inv_AD', doc_number: '2026-0151', customer: 'Cliffside',       total: '92,000',  currency: 'USD', balance: '0',       due: '2026-06-12' },
      { id: 'inv_AE', doc_number: '2026-0152', customer: 'Halo Financial',  total: '610,000', currency: 'USD', balance: '610,000', due: '2026-06-22' },
    ],
  },
  'quickbooks:expenses': {
    kind: 'tabular',
    columns: ['id', 'payee', 'category', 'amount', 'date', 'memo'],
    rows: [
      { id: 'exp_AA', payee: '•••• Hosting',         category: 'Infrastructure',   amount: '12,400', date: '2026-05-23', memo: 'Vault compute • May' },
      { id: 'exp_AB', payee: '•••• Counsel LLP',     category: 'Legal',            amount: '47,500', date: '2026-05-21', memo: 'Series A docs' },
      { id: 'exp_AC', payee: '•••• Custody Inc.',    category: 'Custody fees',     amount: '8,200',  date: '2026-05-15', memo: 'Q2 custody' },
      { id: 'exp_AD', payee: '•••• Risk Engine',     category: 'Software',         amount: '4,000',  date: '2026-05-14', memo: '' },
      { id: 'exp_AE', payee: '•••• Audit Partners',  category: 'Audit',            amount: '92,000', date: '2026-05-08', memo: 'Mid-year audit retainer' },
    ],
  },

  // S3 (non-tabular variant — object list)
  's3:borrower_packets': {
    kind: 'objects',
    items: [
      { name: 'BP-2026-Q1-0001.pdf', size: '4.2 MB',  modified: '2026-05-21' },
      { name: 'BP-2026-Q1-0002.pdf', size: '3.8 MB',  modified: '2026-05-21' },
      { name: 'BP-2026-Q1-0003.pdf', size: '5.1 MB',  modified: '2026-05-22' },
      { name: 'BP-2026-Q1-0004.pdf', size: '4.6 MB',  modified: '2026-05-22' },
      { name: 'BP-2026-Q1-0005.pdf', size: '4.4 MB',  modified: '2026-05-23' },
    ],
  },
}

export function samplePreviewFor(connectorId: string, datasetId: string): SamplePreview | null {
  return SAMPLES[`${connectorId}:${datasetId}`] ?? null
}
