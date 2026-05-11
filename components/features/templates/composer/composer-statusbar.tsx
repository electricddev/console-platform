import { cn } from '@/lib/utils'
import type { Schema } from '@/lib/api/types'

type Props = {
  schema: Schema | null
  datasetId: string
  /** Optional draft line-count of the HQL editor for the right-side info. */
  hqlLineCount?: number
  className?: string
}

export function ComposerStatusbar({ schema, datasetId, hqlLineCount, className }: Props) {
  const attested = !!schema?.signedBy
  // Schema id sometimes already encodes the version (e.g. `sch_mfone_v3`); avoid
  // re-suffixing `· v3` in that case.
  const idHasVersion = schema ? new RegExp(`_v${schema.version}$`).test(schema.id) : false

  return (
    <footer
      className={cn(
        'flex h-7 items-center gap-4 border-t border-foreground/[0.12] bg-muted/30 px-6 md:px-8',
        'font-mono text-[0.7rem] text-foreground/55',
        className,
      )}
      role="status"
      aria-label="Composer status"
    >
      {/* Left: enclave attestation */}
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn(
            'inline-block size-1.5 rounded-full',
            attested ? 'bg-success' : 'bg-warning',
          )}
        />
        <span>
          enclave{' '}
          <span className={attested ? 'text-success' : 'text-warning'}>
            {attested ? 'attested' : 'awaiting'}
          </span>
        </span>
      </div>

      {hqlLineCount != null && hqlLineCount > 0 && (
        <>
          <span aria-hidden className="text-foreground/20">·</span>
          <span>
            <span className="tabular-nums text-foreground/70">{hqlLineCount}</span>{' '}
            {hqlLineCount === 1 ? 'line' : 'lines'}
          </span>
        </>
      )}

      {/* Right: schema + dataset info */}
      <div className="ml-auto flex items-center gap-3">
        {schema && (
          <span>
            schema{' '}
            <span className="text-foreground/70">{schema.id}</span>
            {!idHasVersion && (
              <span className="text-foreground/55"> · v{schema.version}</span>
            )}
          </span>
        )}
        <span aria-hidden className="text-foreground/20">·</span>
        <span>
          dataset{' '}
          <span className="text-foreground/70">{datasetId}</span>
        </span>
      </div>
    </footer>
  )
}
