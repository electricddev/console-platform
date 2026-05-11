import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ColumnDescriptor, EnumTone } from './types'
import { formatValue } from './format'

const TONE_CLASS: Record<EnumTone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger:  'bg-destructive/15 text-destructive border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
}

const NUMERIC: ReadonlyArray<ColumnDescriptor['format']> = ['currency', 'percent', 'bps', 'integer', 'decimal']

export function Cell({ value, column }: { value: unknown; column: ColumnDescriptor }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  if (column.format === 'enum') {
    const def = column.enumValues?.[String(value)]
    const tone: EnumTone = def?.tone ?? 'neutral'
    return (
      <Badge variant="outline" className={cn(TONE_CLASS[tone], 'font-normal')}>
        {def?.label ?? String(value)}
      </Badge>
    )
  }

  const text = formatValue(value, column)
  const isNumeric = NUMERIC.includes(column.format)
  const isMono = isNumeric || column.format === 'identifier' || column.format === 'date' || column.format === 'datetime'

  return (
    <span className={cn(isMono && 'font-mono text-xs', isNumeric && 'text-right block tabular-nums')}>
      {text}
    </span>
  )
}
