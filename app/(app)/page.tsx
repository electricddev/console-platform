import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage() {
  const sessionUser = await requireUser()
  const user = await getCurrentUser({ user: sessionUser })
  const org = fixtures.orgs.find((o) => o.id === user.orgId)!

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <PageHeader
        eyebrow={`// hyve · ${user.role}`}
        title={`Welcome, ${user.name.split(' ')[0]}`}
        description={
          user.role === 'originator'
            ? `${org.name} data plane health, pending approvals, and counterparty activity will live here.`
            : `Your watched datasets, AI insights, recent runs, and pending tasks will live here.`
        }
      />

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Plan 02 fills this in</CardTitle>
            <CardDescription>Counterparty home: headline metrics, AI insights feed, recent runs, watched datasets, pending tasks.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Spec §4.3 (counterparty view).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan 03 fills this in</CardTitle>
            <CardDescription>Originator home: ingestion health, pending approvals, counterparty activity, data quality alerts.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Spec §4.3 (originator view).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Foundation in place</CardTitle>
            <CardDescription>Press ⌘K to test the command palette. Click the dev role switcher (bottom right) to flip personas.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  )
}
