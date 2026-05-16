import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageChart } from '@/components/features/settings/usage-chart'
import { InvoiceTable } from '@/components/features/settings/invoice-table'

export default async function BillingPage() {
  const session = await requireUser()
  const invoices = await settings.listInvoices({ user: session })
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Usage (last 6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceTable invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  )
}
