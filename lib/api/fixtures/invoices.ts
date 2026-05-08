import type { Invoice } from '@/lib/api/types'

export const invoiceFixtures: Invoice[] = Array.from({ length: 6 }, (_, i) => ({
  id: `inv_${100 + i}`,
  periodStart: new Date(2026, i, 1).toISOString(),
  periodEnd: new Date(2026, i + 1, 0).toISOString(),
  amountUsd: 1200 + i * 240,
  status: i === 5 ? 'open' : 'paid',
}))
