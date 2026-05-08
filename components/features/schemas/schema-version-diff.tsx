import type { Schema, SchemaField } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'

type Diff = {
  added: SchemaField[]
  removed: SchemaField[]
  changed: { field: string; before: SchemaField; after: SchemaField }[]
}

function diff(prev: Schema, next: Schema): Diff {
  const prevByName = new Map(prev.fields.map((f) => [f.name, f]))
  const nextByName = new Map(next.fields.map((f) => [f.name, f]))
  const added: SchemaField[] = []
  const removed: SchemaField[] = []
  const changed: Diff['changed'] = []
  for (const f of next.fields) {
    const before = prevByName.get(f.name)
    if (!before) added.push(f)
    else if (JSON.stringify(before) !== JSON.stringify(f))
      changed.push({ field: f.name, before, after: f })
  }
  for (const f of prev.fields) {
    if (!nextByName.has(f.name)) removed.push(f)
  }
  return { added, removed, changed }
}

export function SchemaVersionDiff({ prev, next }: { prev: Schema; next: Schema }) {
  const d = diff(prev, next)
  return (
    <div className="grid gap-4">
      <Section title="Added" tone="success">
        {d.added.map((f) => (
          <Row key={f.name} field={f} />
        ))}
        {d.added.length === 0 && <Empty>No fields added.</Empty>}
      </Section>
      <Section title="Removed" tone="destructive">
        {d.removed.map((f) => (
          <Row key={f.name} field={f} />
        ))}
        {d.removed.length === 0 && <Empty>No fields removed.</Empty>}
      </Section>
      <Section title="Changed" tone="info">
        {d.changed.map((c) => (
          <div
            key={c.field}
            className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-surface/30 p-2"
          >
            <div>
              <p className="font-tag text-foreground/55 text-[0.65rem]">{'// before'}</p>
              <Row field={c.before} />
            </div>
            <div>
              <p className="font-tag text-foreground/55 text-[0.65rem]">{'// after'}</p>
              <Row field={c.after} />
            </div>
          </div>
        ))}
        {d.changed.length === 0 && <Empty>No fields changed.</Empty>}
      </Section>
    </div>
  )
}

function Section({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'success' | 'destructive' | 'info'
  children: React.ReactNode
}) {
  const TONE = {
    success: 'border-success/30 bg-success/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    info: 'border-info/30 bg-info/5',
  } as const
  return (
    <section className={`rounded-lg border ${TONE[tone]} p-4`}>
      <h3 className="font-tag mb-2 text-foreground/60">{`// ${title}`}</h3>
      <div className="grid gap-1.5">{children}</div>
    </section>
  )
}

function Row({ field }: { field: SchemaField }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono text-xs">{field.name}</span>
      <Badge variant="outline" className="font-tag text-[0.65rem]">
        {field.type}
      </Badge>
      <Badge variant="outline" className="font-tag text-[0.65rem]">
        {field.exposure}
      </Badge>
      {field.minBucketSize != null && (
        <span className="text-xs text-muted-foreground">min bucket {field.minBucketSize}</span>
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
