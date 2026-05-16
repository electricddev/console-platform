import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import { vaults } from '@/components/v2/features/cp/cp-fixtures'
import { fmtRelative, fmtAbsolute } from '@/components/v2/features/cp/cp-format'

export default function CpVaultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-v2-muted/60">
          {'// VAULTS'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
          Vaults
        </h1>
        <p className="mt-1 text-sm text-v2-muted">
          Provider-owned data you&apos;re authorized to author analyses against.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {vaults.map((vault) => (
          <Surface
            key={vault.id}
            padding="none"
            radius="xl"
            className="flex flex-col gap-0 overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-3 border-b border-v2-border/40 px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[13.5px] font-semibold text-v2-foreground">
                  {vault.name}
                </p>
                <p className="mt-0.5 text-[12.5px] text-v2-muted">{vault.label}</p>
              </div>
              <StatusPill
                tone={vault.myAccessLevel === 'author' ? 'success' : 'neutral'}
                size="xs"
              >
                {vault.myAccessLevel}
              </StatusPill>
            </div>

            {/* Card body — metadata grid */}
            <div className="grid grid-cols-2 divide-x divide-v2-border/40">
              <MetaCell label="Provider" value={vault.provider.name} />
              <MetaCell label="Schemas" value={String(vault.schemaCount)} mono />
              <MetaCell
                label="Analyses authored"
                value={vault.myAnalysisCount === 0 ? '—' : String(vault.myAnalysisCount)}
                mono
              />
              <MetaCell
                label="Access granted"
                value={fmtRelative(vault.grantedAt)}
                mono
                hint={vault.grantedBy}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-v2-border/40 px-5 py-2.5">
              <span className="text-[11.5px] text-v2-muted/60">
                Provider last updated
              </span>
              <span
                title={fmtAbsolute(vault.lastProviderUpdateAt)}
                className="font-mono text-[11.5px] tabular-nums text-v2-muted/70"
              >
                {fmtRelative(vault.lastProviderUpdateAt)}
              </span>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  )
}

function MetaCell({
  label,
  value,
  hint,
  mono = false,
}: {
  label: string
  value: string
  hint?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <span className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-v2-muted/60">
        {label}
      </span>
      <span
        className={`text-[13px] text-v2-foreground ${mono ? 'font-mono tabular-nums' : ''}`}
        title={hint}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[11px] text-v2-muted/50 truncate" title={hint}>
          {hint}
        </span>
      )}
    </div>
  )
}
