import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fmtDate } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { MerkleProofPopover } from './merkle-proof-popover'
import { RESOURCE_HREF } from './resource-href'
import type { AuditEntry } from '@/lib/api/types'
import { fixtures } from '@/lib/api/fixtures'

export function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  const actorOrg = fixtures.orgs.find((o) => o.id === entry.actorOrgId)
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-4 border-l border-border pl-6 pb-6 relative">
      <div aria-hidden className="absolute left-[-5px] top-1.5 size-2.5 rounded-full bg-foreground" />
      <p className="font-mono text-xs text-muted-foreground">{fmtDate(entry.timestamp)}</p>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-tag text-[0.65rem]">{entry.action}</Badge>
          <Link href={RESOURCE_HREF[entry.resourceType](entry.resourceId)} className="font-mono text-xs hover:underline">{entry.resourceType}/{entry.resourceId}</Link>
        </div>
        <p className="text-sm">
          <span className="font-medium">{actorOrg?.name ?? entry.actorOrgId}</span>
          <span className="text-muted-foreground"> · {entry.actorId}</span>
        </p>
        <div className="flex items-center gap-2 text-xs">
          <CopyableHash value={entry.hash} />
          {entry.anchorTxHash && <CopyableHash value={entry.anchorTxHash} />}
          <MerkleProofPopover proof={entry.merkleProof} hash={entry.hash} />
        </div>
      </div>
    </div>
  )
}
