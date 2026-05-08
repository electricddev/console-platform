import { Badge } from '@/components/ui/badge'
import type { SchemaField } from '@/lib/api/types'

const TONE: Record<SchemaField['exposure'], string> = {
  queryable: 'bg-success/15 text-success border-success/30',
  'aggregated-only': 'bg-info/15 text-info border-info/30',
  private: 'bg-muted text-muted-foreground border-border',
}

const LABEL: Record<SchemaField['exposure'], string> = {
  queryable: 'queryable',
  'aggregated-only': 'aggregated-only',
  private: 'private',
}

export function FieldExposureBadge({ exposure }: { exposure: SchemaField['exposure'] }) {
  return <Badge variant="outline" className={`font-tag text-[0.65rem] ${TONE[exposure]}`}>{LABEL[exposure]}</Badge>
}
