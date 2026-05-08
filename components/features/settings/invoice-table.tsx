import { Badge } from '@/components/ui/badge'
import { fmtCurrency, fmtDate } from '@/lib/format'
import type { Invoice } from '@/lib/api/types'

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Period</th>
            <th className="text-right">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-t border-border/60">
              <td className="px-3 py-2 text-muted-foreground">
                {fmtDate(i.periodStart)} → {fmtDate(i.periodEnd)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCurrency(i.amountUsd)}</td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className={
                    i.status === 'paid'
                      ? 'bg-success/15 text-success border-success/30'
                      : 'font-tag text-[0.65rem]'
                  }
                >
                  {i.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
