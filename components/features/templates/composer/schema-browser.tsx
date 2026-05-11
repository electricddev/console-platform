'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Lock, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Schema, SchemaField } from '@/lib/api/types'

type Props = {
  schema: Schema | null
  onInsert: (text: string) => void
  className?: string
}

type Tier = 'public' | 'aggregate' | 'private'

type TierMeta = {
  id: Tier
  label: string
  /** Single-line short summary for empty-section explainer. */
  hint: string
  /** Indicator dot color. */
  dotClass: string
  /** Subtle text accent for section header. */
  textClass: string
}

const TIERS: TierMeta[] = [
  {
    id: 'public',
    label: 'Public',
    hint: 'Queryable directly',
    dotClass: 'bg-success',
    textClass: 'text-success',
  },
  {
    id: 'aggregate',
    label: 'Aggregate',
    hint: 'Wrap with dp_avg / dp_sum / aggregate()',
    dotClass: 'bg-accent',
    textClass: 'text-accent',
  },
  {
    id: 'private',
    label: 'Private',
    hint: 'Cannot be selected directly',
    dotClass: 'bg-destructive',
    textClass: 'text-destructive',
  },
]

function tierFor(field: SchemaField): Tier {
  if (field.exposure === 'private') return 'private'
  if (field.exposure === 'aggregated-only') return 'aggregate'
  return 'public'
}

export function SchemaBrowser({ schema, onInsert, className }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [openTiers, setOpenTiers] = useState<Record<Tier, boolean>>({
    public: true,
    aggregate: true,
    private: true,
  })

  // Filter + group fields by tier
  const grouped = useMemo(() => {
    const all = schema?.fields ?? []
    const q = search.trim().toLowerCase()
    const filter = (f: SchemaField) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q)

    const buckets: Record<Tier, SchemaField[]> = { public: [], aggregate: [], private: [] }
    for (const f of all) {
      if (!filter(f)) continue
      buckets[tierFor(f)].push(f)
    }
    for (const tier of Object.keys(buckets) as Tier[]) {
      buckets[tier].sort((a, b) => a.name.localeCompare(b.name))
    }
    return buckets
  }, [schema, search])

  const total = schema?.fields.length ?? 0
  const matchedCount = grouped.public.length + grouped.aggregate.length + grouped.private.length

  if (collapsed) {
    return (
      <aside
        className={cn(
          'flex w-9 shrink-0 flex-col items-center border-r border-foreground/[0.12] bg-muted py-2',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand schema browser"
          className="flex size-6 items-center justify-center rounded text-foreground/45 hover:text-foreground transition-colors"
        >
          <ChevronRight className="size-3.5" strokeWidth={1.75} />
        </button>
        <div className="mt-4 flex flex-1 items-center justify-center">
          <span
            className="font-tag text-[0.62rem] text-foreground/45"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            schema
          </span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        'flex w-[300px] shrink-0 flex-col border-r border-foreground/[0.12] bg-muted overflow-hidden',
        className,
      )}
    >
      {/* Header — generous padding, no // marker */}
      <div className="border-b border-border bg-muted px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-base leading-tight text-foreground truncate">
              {schema?.datasetId ?? '—'}
            </p>
            <p className="font-mono text-[0.7rem] text-foreground/50 mt-0.5 tabular-nums">
              {schema ? `Schema · v${schema.version}` : 'No schema'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse schema browser"
            className="shrink-0 flex size-6 items-center justify-center rounded text-foreground/40 hover:bg-background hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Search — with icon, cleaner placeholder */}
        <div className="relative mt-3">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground/35"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields"
            aria-label="Search schema fields"
            className={cn(
              'h-7 w-full rounded border-0 bg-background pl-8 pr-2 font-mono text-[0.75rem] text-foreground',
              'placeholder:text-foreground/35',
              'focus:outline-none focus:ring-1 focus:ring-accent/40',
            )}
          />
        </div>
      </div>

      {/* Field list — grouped by tier */}
      <ScrollArea className="flex-1">
        {schema == null && (
          <p className="px-5 py-6 font-mono text-[0.75rem] text-foreground/40">
            Schema unavailable.
          </p>
        )}

        {schema != null && matchedCount === 0 && (
          <p className="px-5 py-6 font-mono text-[0.75rem] text-foreground/40">
            No fields match.
          </p>
        )}

        {schema != null && matchedCount > 0 && (
          <ul role="list" aria-label="Schema fields" className="pb-4">
            {TIERS.map((tier) => {
              const fields = grouped[tier.id]
              if (fields.length === 0) return null
              const open = openTiers[tier.id]

              return (
                <li key={tier.id} className="mt-3 first:mt-2">
                  {/* Section header */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTiers((s) => ({ ...s, [tier.id]: !s[tier.id] }))
                    }
                    aria-expanded={open}
                    className={cn(
                      'group flex w-full items-center gap-2 px-5 py-1 text-left',
                      'transition-colors hover:bg-muted',
                    )}
                  >
                    <ChevronDown
                      aria-hidden
                      strokeWidth={1.75}
                      className={cn(
                        'size-3 text-foreground/40 transition-transform duration-200 ease-out',
                        !open && '-rotate-90',
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn('size-1.5 rounded-full', tier.dotClass)}
                    />
                    <span
                      className={cn(
                        'font-tag tracking-wider text-[0.62rem]',
                        tier.textClass,
                      )}
                    >
                      {tier.label}
                    </span>
                    <span className="font-mono tabular-nums text-[0.62rem] text-foreground/35 ml-auto">
                      {fields.length}
                    </span>
                  </button>

                  {/* Section rows */}
                  {open && (
                    <ul role="list" className="mt-0.5">
                      {fields.map((field) => (
                        <li key={field.name}>
                          <FieldRow
                            field={field}
                            onInsert={onInsert}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>

      {/* Footer — minimal, no // marker */}
      {schema && (
        <div className="border-t border-border bg-muted px-5 py-2">
          <span className="font-mono text-[0.65rem] tabular-nums text-foreground/45">
            {total} field{total !== 1 ? 's' : ''}
            {search && total !== matchedCount && ` · ${matchedCount} matching`}
          </span>
        </div>
      )}
    </aside>
  )
}

// ─── Field row ───────────────────────────────────────────────────────────────

type FieldRowProps = {
  field: SchemaField
  onInsert: (text: string) => void
}

function FieldRow({ field, onInsert }: FieldRowProps) {
  const attested = field.minBucketSize != null

  return (
    <button
      type="button"
      onClick={() => onInsert(field.name)}
      title={field.description ? `${field.name} — ${field.description}` : field.name}
      aria-label={`Insert ${field.name} into editor`}
      className={cn(
        'group relative block w-full pl-10 pr-5 py-1.5 text-left transition-colors',
        'hover:bg-accent/[0.06]',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="flex-1 truncate font-mono text-[0.78rem] leading-tight text-foreground">
          {field.name}
        </span>
        {attested && (
          <Lock
            aria-hidden
            strokeWidth={1.75}
            className="size-3 shrink-0 text-foreground/35 group-hover:opacity-0 transition-opacity"
          />
        )}
        {/* Type label — fades on hover so the insert affordance has room */}
        <span className="shrink-0 font-mono text-[0.62rem] tabular-nums text-foreground/35 transition-opacity group-hover:opacity-0">
          {field.type}
        </span>
        {/* Insert affordance — appears on hover at right edge */}
        <Plus
          aria-hidden
          strokeWidth={2}
          className="absolute right-4 top-2 size-3.5 text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </div>
      {field.description && (
        <span className="mt-0.5 block truncate font-mono text-[0.62rem] text-foreground/40 leading-tight">
          {field.description}
        </span>
      )}
    </button>
  )
}
