import { requireUser } from '@/lib/auth/server'
import { listAudit, exportAuditBundle } from '@/lib/api/endpoints/audit'
import { PageHeader } from '@/components/common/page-header'
import { AuditFilters } from './_components/audit-filters'
import { ExportButton } from './_components/export-button'
import { AuditEntryRow } from '@/components/features/audit/audit-entry-row'
import { AuditEntryCard } from '@/components/features/audit/audit-entry-card'
import Link from 'next/link'
import type { AuditEntry } from '@/lib/api/types'

type Search = { q?: string; type?: string; actor?: string; from?: string; to?: string; view?: string }

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser()
  const sp = await searchParams
  const filters = {
    search: sp.q,
    resourceType: (sp.type && sp.type !== 'all') ? (sp.type as AuditEntry['resourceType']) : undefined,
    actorId: sp.actor || undefined,
    fromDate: sp.from ? `${sp.from}T00:00:00.000Z` : undefined,
    toDate: sp.to ? `${sp.to}T23:59:59.999Z` : undefined,
  }
  const ctx = { user: session }
  const entries = await listAudit(ctx, filters)
  const view = sp.view === 'table' ? 'table' : 'timeline'

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// audit"
        title="Cryptographic audit log"
        description="Append-only record of every action against your data. Filter, deep-link, and export a signed bundle."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle current={view} />
            <ExportButton onExport={async () => { 'use server'; return exportAuditBundle({ user: session }, filters) }} />
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4">
        <div className="rounded-lg border border-border bg-surface/40">
          <AuditFilters />
        </div>

        {view === 'table' ? (
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface/60 text-left font-tag text-foreground/55">
                <tr className="[&>th]:px-3 [&>th]:py-2"><th>When</th><th>Action</th><th>Resource</th><th>Actor</th><th>Hash</th><th>Anchor</th><th>Proof</th></tr>
              </thead>
              <tbody>
                {entries.slice(0, 500).map((e) => <AuditEntryRow key={e.id} entry={e} />)}
              </tbody>
            </table>
            {entries.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No entries match these filters.</p>}
          </div>
        ) : (
          <div className="grid gap-2">
            {entries.slice(0, 200).map((e) => <AuditEntryCard key={e.id} entry={e} />)}
            {entries.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No entries match these filters.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function ViewToggle({ current }: { current: 'timeline' | 'table' }) {
  return (
    <div className="flex rounded-md border border-border p-0.5 text-xs">
      <Link href="?view=timeline" className={`px-2 py-1 rounded-sm ${current === 'timeline' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>Timeline</Link>
      <Link href="?view=table" className={`px-2 py-1 rounded-sm ${current === 'table' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>Table</Link>
    </div>
  )
}
