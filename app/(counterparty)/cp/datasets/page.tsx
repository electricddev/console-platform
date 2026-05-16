import { Surface } from '@/components/v2/ui/surface'

export default function CpDatasetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
          {'// datasets'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
          Datasets
        </h1>
        <p className="mt-2 max-w-prose text-sm text-v2-muted">
          Catalog of data feeds you&apos;re authorized for.
        </p>
      </div>
      <Surface padding="md">
        <p className="text-sm text-v2-muted">Coming soon.</p>
      </Surface>
    </div>
  )
}
