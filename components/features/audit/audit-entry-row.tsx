import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime, fmtDate } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { MerkleProofPopover } from './merkle-proof-popover'
import { RESOURCE_HREF } from './resource-href'
import type { AuditEntry } from '@/lib/api/types'
import { fixtures } from '@/lib/api/fixtures'

const ACTION_TONE: Record<AuditEntry['action'], string> = {
  'approved-template': 'bg-success/15 text-success border-success/30',
  'denied-template': 'bg-destructive/15 text-destructive border-destructive/30',
  'requested-changes': 'bg-info/15 text-info border-info/30',
  'submitted-template': 'bg-muted text-muted-foreground border-border',
  'executed-query': 'bg-info/15 text-info border-info/30',
  'published-result': 'bg-success/15 text-success border-success/30',
  'disputed-run': 'bg-warning/15 text-warning border-warning/30',
  'published-schema': 'bg-success/15 text-success border-success/30',
  'updated-schema': 'bg-info/15 text-info border-info/30',
  'granted-access': 'bg-success/15 text-success border-success/30',
  'revoked-access': 'bg-destructive/15 text-destructive border-destructive/30',
  'connected-source': 'bg-success/15 text-success border-success/30',
  'paused-source': 'bg-warning/15 text-warning border-warning/30',
  'resumed-source': 'bg-success/15 text-success border-success/30',
}

export function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const actorOrg = fixtures.orgs.find((o) => o.id === entry.actorOrgId)
  const href = RESOURCE_HREF[entry.resourceType](entry.resourceId)

  return (
    <tr className="border-t border-border/60 hover:bg-muted/40">
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground" title={fmtDate(entry.timestamp)}>{fmtRelativeTime(entry.timestamp)}</td>
      <td className="px-3 py-2"><Badge variant="outline" className={ACTION_TONE[entry.action]}>{entry.action}</Badge></td>
      <td className="px-3 py-2"><Link href={href} className="font-mono text-xs hover:underline">{entry.resourceType}/{entry.resourceId}</Link></td>
      <td className="px-3 py-2 text-muted-foreground">{actorOrg?.name ?? entry.actorOrgId} · {entry.actorId}</td>
      <td className="px-3 py-2"><CopyableHash value={entry.hash} /></td>
      <td className="px-3 py-2">{entry.anchorTxHash ? <CopyableHash value={entry.anchorTxHash} /> : '—'}</td>
      <td className="px-3 py-2"><MerkleProofPopover proof={entry.merkleProof} hash={entry.hash} /></td>
    </tr>
  )
}
