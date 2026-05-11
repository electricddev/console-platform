import Link from 'next/link'
import { ArrowLeft, Database, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  datasetId: string
  schemaId: string
  name?: string
  onSave: () => void
  onSubmit: () => void
  saving: boolean
  canSave: boolean
  className?: string
}

export function ComposerTopbar({
  datasetId,
  schemaId,
  name,
  onSave,
  onSubmit,
  saving,
  canSave,
  className,
}: Props) {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-3 border-b border-foreground/[0.12] bg-surface px-6 md:px-8',
        className,
      )}
    >
      {/* Back link + title — single row */}
      <div className="flex items-center gap-3 min-w-0 shrink">
        <Link
          href="/templates"
          aria-label="Back to templates"
          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
        <h1 className="font-display text-xl tracking-tight text-foreground truncate">
          {name && name.trim().length > 0 ? name : 'New template'}
        </h1>
      </div>

      {/* Dataset + schema chips, grouped with breathing room from the title */}
      <div className="ml-2 flex items-center gap-1.5 shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 font-mono text-[0.7rem] tabular-nums text-foreground/70">
          <Database aria-hidden strokeWidth={1.75} className="size-3 text-foreground/40" />
          {datasetId}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 font-mono text-[0.7rem] tabular-nums text-foreground/70">
          <GitBranch aria-hidden strokeWidth={1.75} className="size-3 text-foreground/40" />
          {schemaId}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-foreground bg-foreground px-3.5 py-1.5',
            'font-mono text-[0.75rem] text-background transition-all',
            'hover:bg-foreground/85 active:translate-y-px',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSave}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-foreground/40 px-3.5 py-1.5',
            'font-mono text-[0.75rem] text-foreground/80 transition-all bg-transparent',
            'hover:bg-muted hover:text-foreground hover:border-foreground/60 active:translate-y-px',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          Submit for approval
        </button>
      </div>
    </header>
  )
}
