'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  FileCheck,
  ListChecks,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sigma,
} from 'lucide-react'
import { Surface } from '@/components/v2/ui/surface'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { getPaletteFamily } from '@/components/v2/lib/palette'
import { datasetAccess } from './data-fixture'
import type {
  AnalysisRule,
  CounterpartyGrant,
  Dataset,
  DatasetAccess,
  GrantStatus,
  QueryTemplate,
  TemplateStatus,
} from './data-fixture'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

// ── Status maps ──────────────────────────────────────────────────────────────

const TEMPLATE_TONE: Record<TemplateStatus, StatusTone> = {
  live: 'success',
  draft: 'neutral',
  paused: 'warning',
}

const GRANT_TONE: Record<GrantStatus, StatusTone> = {
  active: 'success',
  paused: 'warning',
  expired: 'neutral',
}

// ── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, caption, id }: { title: string; caption: string; id?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="text-[13px] font-medium tracking-tight text-v2-foreground">{title}</h2>
      <p className="text-[12px] text-v2-muted">{caption}</p>
    </div>
  )
}

// ── Field chip (mono style, like PrivacyChip) ────────────────────────────────

function FieldChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-v2-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-v2-foreground/70">
      {name}
    </span>
  )
}

// ── Privacy mechanism summary chips ─────────────────────────────────────────

function PrivacyMechChips({
  aggregation,
  dp,
}: {
  aggregation: number | null
  dp: boolean
}) {
  if (!aggregation && !dp) {
    return (
      <span className="text-[11px] text-v2-muted/60">No additional privacy mechanisms</span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {aggregation !== null && (
        <span className="inline-flex items-center gap-1 rounded-md bg-v2-info/[0.10] px-1.5 py-0.5 text-[10.5px] font-medium text-v2-info">
          <Sigma className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
          Aggregation ≥{aggregation}
        </span>
      )}
      {dp && (
        <span className="inline-flex items-center gap-1 rounded-md bg-v2-success/[0.10] px-1.5 py-0.5 text-[10.5px] font-medium text-v2-success">
          <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
          DP noise
        </span>
      )}
    </div>
  )
}

// ── Input type badge ─────────────────────────────────────────────────────────

function InputTypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded bg-v2-foreground/[0.06] px-1 py-[1px] font-mono text-[9.5px] text-v2-muted/80">
      {type}
    </span>
  )
}

// ── 1. Privacy posture summary banner ────────────────────────────────────────

const ANALYSIS_RULE_META: Record<AnalysisRule, { Icon: typeof Sigma; label: string; caption: string }> = {
  aggregation: {
    Icon: Sigma,
    label: 'Aggregation',
    caption: 'Only aggregate queries — no row-level output returned.',
  },
  list: {
    Icon: ListChecks,
    label: 'List',
    caption: 'Intersection queries returning entity match lists only.',
  },
  custom: {
    Icon: FileCheck,
    label: 'Custom templates',
    caption: 'Only pre-approved query templates may run.',
  },
}

function PrivacyPostureBanner({
  access,
  analysisRule,
  family,
}: {
  access: DatasetAccess
  analysisRule: AnalysisRule
  family: [string, string, string]
}) {
  const ruleMeta = ANALYSIS_RULE_META[analysisRule]
  const RuleIcon = ruleMeta.Icon
  return (
    <AuraCard variant="muted" family={family} seed={7} radius="xl" className="p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-medium tracking-tight text-v2-foreground">
            Privacy posture · this dataset
          </h2>
          <button
            type="button"
            className="text-[11px] text-v2-muted/70 underline-offset-2 hover:text-v2-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
          >
            Edit policy
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Analysis rule */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
              Analysis rule
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-v2-foreground">
              <RuleIcon className="h-3.5 w-3.5 text-v2-muted/70" strokeWidth={1.75} aria-hidden />
              {ruleMeta.label}
            </span>
            <span className="text-[10.5px] text-v2-muted/70">{ruleMeta.caption}</span>
          </div>

          {/* Aggregation threshold */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
              Aggregation threshold
            </span>
            <span className="font-mono text-[14px] tabular-nums text-v2-foreground">
              {access.aggregationThreshold !== null
                ? `${access.aggregationThreshold} records`
                : '—'}
            </span>
            <span className="text-[10.5px] text-v2-muted/70">Min obligors per result bucket</span>
          </div>

          {/* DP budget */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
              DP budget
            </span>
            {access.dpBudget !== null ? (
              <>
                <span className="font-mono text-[14px] tabular-nums text-v2-foreground">
                  ε = {access.dpBudget.toFixed(1)}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-v2-foreground/[0.10]"
                    role="img"
                    aria-label={`${access.dpBudgetUsedPct}% of DP budget used`}
                  >
                    <div
                      className="h-full rounded-full bg-v2-info"
                      style={{ width: `${access.dpBudgetUsedPct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-v2-muted/70">
                    {access.dpBudgetUsedPct}% used
                  </span>
                </div>
                <span className="text-[10.5px] text-v2-muted/70">Resets monthly</span>
              </>
            ) : (
              <span className="font-mono text-[14px] text-v2-muted/60">—</span>
            )}
          </div>

          {/* Privacy unit — now a join-classified field */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
              Privacy unit
            </span>
            {access.privacyUnit ? (
              <>
                <span className="font-mono text-[13px] text-v2-foreground">
                  {access.privacyUnit}
                </span>
                <span className="text-[10.5px] text-v2-muted/70">
                  Join-classified — match key only, never returned
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-[14px] text-v2-muted/60">—</span>
                <span className="text-[10.5px] text-v2-muted/70">
                  Not applicable (aggregation-only)
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </AuraCard>
  )
}

// ── 2. Query template row (expandable) ───────────────────────────────────────

function TemplateRow({
  template,
  isExpanded,
  onToggle,
}: {
  template: QueryTemplate
  isExpanded: boolean
  onToggle: () => void
}) {
  const maxFields = 3
  const visibleFields = template.fields.slice(0, maxFields)
  const extraCount = template.fields.length - maxFields
  const panelId = `qt-panel-${template.id}`
  const triggerId = `qt-trigger-${template.id}`

  return (
    <div>
      {/* Summary row */}
      <button
        type="button"
        id={triggerId}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid w-full grid-cols-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-v2-foreground/[0.02] sm:grid-cols-[1fr_auto] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-v2-foreground/40"
      >
        {/* Left col */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-medium text-v2-foreground">{template.name}</span>
            <StatusPill tone={TEMPLATE_TONE[template.status]} size="xs">
              {template.status}
            </StatusPill>
          </div>
          <p className="text-[12px] leading-relaxed text-v2-muted">{template.description}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleFields.map((f) => (
              <FieldChip key={f} name={f} />
            ))}
            {extraCount > 0 && (
              <span className="text-[10.5px] text-v2-muted/60">+{extraCount} more</span>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[15px] font-normal tabular-nums text-v2-foreground">
              {template.runs7d}
            </span>
            <span className="text-[10.5px] text-v2-muted/70">runs · 7d</span>
          </div>
          <div className="flex items-center gap-1 text-v2-muted/50">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isExpanded}
        className="border-t border-v2-border/30 bg-v2-foreground/[0.015] px-4 pb-4 pt-3"
      >
          <div className="flex flex-col gap-4">
            {/* Inputs */}
            {template.inputs.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                  Inputs
                </span>
                <ul className="flex flex-col gap-1.5">
                  {template.inputs.map((inp) => (
                    <li
                      key={inp.name}
                      className="flex flex-wrap items-center gap-2 text-[12px]"
                    >
                      <span className="font-mono text-v2-foreground/90">{inp.name}</span>
                      <InputTypeBadge type={inp.type} />
                      {inp.required ? (
                        <span className="text-[10.5px] font-medium text-v2-warning/80">
                          required
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-v2-muted/60">optional</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Result shape */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Result shape
              </span>
              <span className="text-[12px] text-v2-foreground/80">{template.resultShape}</span>
            </div>

            {/* Privacy mechanisms */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Privacy
              </span>
              <PrivacyMechChips
                aggregation={template.privacy.aggregation}
                dp={template.privacy.differentialPrivacy}
              />
            </div>

            {/* Ghost actions */}
            <div className="flex items-center gap-2 border-t border-v2-border/30 pt-3">
              <button
                type="button"
                className="rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[11.5px] font-medium text-v2-foreground/80 transition-colors hover:bg-v2-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
              >
                View SQL
              </button>
              <button
                type="button"
                className="rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[11.5px] font-medium text-v2-foreground/80 transition-colors hover:bg-v2-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
              >
                Run preview
              </button>
            </div>
          </div>
        </div>
      </div>
  )
}

// ── 2. Templates catalog ──────────────────────────────────────────────────────

function TemplatesCatalog({ templates }: { templates: QueryTemplate[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <section aria-labelledby="access-templates-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="access-templates-heading"
        title="Templates"
        caption="Approved queries counterparties can run against this dataset."
      />
      <Surface radius="xl" className="overflow-hidden divide-y divide-v2-border/30">
        {templates.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            isExpanded={expandedId === t.id}
            onToggle={() => toggle(t.id)}
          />
        ))}
        <div className="px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] text-v2-muted transition-colors hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            New template
          </button>
        </div>
      </Surface>
    </section>
  )
}

// ── 3. Grant card (per counterparty) ─────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function GrantCard({
  grant,
  templateById,
}: {
  grant: CounterpartyGrant
  templateById: Map<string, QueryTemplate>
}) {

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-medium text-v2-foreground">{grant.counterparty}</span>
          <StatusPill tone={GRANT_TONE[grant.status]} size="xs">
            {grant.status}
          </StatusPill>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[15px] tabular-nums text-v2-foreground">
              {grant.runs7d}
            </span>
            <span className="text-[10.5px] text-v2-muted/70">runs · 7d</span>
          </div>
          <span className="font-mono text-[11px] text-v2-muted/70">{grant.rateLimit}</span>
        </div>
      </div>

      {/* Validity dates */}
      <p className="text-[11px] text-v2-muted/70">
        Valid from{' '}
        <span className="font-mono text-v2-foreground/70">{fmtDate(grant.validFrom)}</span>
        {grant.validUntil ? (
          <>
            {' '}
            · expires{' '}
            <span className="font-mono text-v2-foreground/70">{fmtDate(grant.validUntil)}</span>
          </>
        ) : (
          <span className="ml-1 text-v2-muted/50">· open-ended</span>
        )}
      </p>

      {/* Granted template pills */}
      <div
        className="flex flex-wrap gap-1.5"
        aria-label={`Templates granted to ${grant.counterparty}`}
      >
        {grant.templateIds.map((tid) => {
          const tpl = templateById.get(tid)
          return (
            <span
              key={tid}
              className="inline-flex items-center rounded-md border border-v2-border/50 bg-v2-foreground/[0.03] px-2 py-0.5 text-[11px] text-v2-foreground/80 transition-colors hover:bg-v2-foreground/[0.07]"
              title={tpl?.description}
            >
              {tpl?.name ?? tid}
            </span>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-v2-border/20 pt-3">
        <button
          type="button"
          aria-disabled="true"
          tabIndex={-1}
          className="cursor-not-allowed rounded-md border border-v2-border/50 bg-v2-surface px-2 py-1 text-[11px] font-medium text-v2-foreground/70 opacity-60"
        >
          Pause
        </button>
        <button
          type="button"
          aria-disabled="true"
          tabIndex={-1}
          className="cursor-not-allowed rounded-md border border-v2-border/50 bg-v2-surface px-2 py-1 text-[11px] font-medium text-v2-foreground/70 opacity-60"
        >
          Revoke
        </button>
        <button
          type="button"
          aria-disabled="true"
          tabIndex={-1}
          className="cursor-not-allowed rounded-md border border-v2-border/50 bg-v2-surface px-2 py-1 text-[11px] font-medium text-v2-foreground/70 opacity-60"
        >
          Edit grants
        </button>
        <span className="ml-auto flex h-6 w-6 items-center justify-center text-v2-muted/40" aria-hidden="true">
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
      </div>
    </div>
  )
}

// ── 3. Counterparty access section ────────────────────────────────────────────

function CounterpartyAccessSection({
  grants,
  templates,
}: {
  grants: CounterpartyGrant[]
  templates: QueryTemplate[]
}) {
  const templateById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates],
  )

  return (
    <section aria-labelledby="access-grants-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="access-grants-heading"
        title="Counterparty access"
        caption="Who can run what against this dataset."
      />
      <Surface radius="xl" className="overflow-hidden divide-y divide-v2-border/30">
        {grants.map((g) => (
          <GrantCard key={g.counterparty} grant={g} templateById={templateById} />
        ))}
      </Surface>
    </section>
  )
}

// ── 4. Row-level access (conditional) ────────────────────────────────────────

function qualifiesForRowLevel(dataset: Dataset): boolean {
  const hasPrivateFields = dataset.fields.some((f) => f.privacy === 'private')
  return hasPrivateFields && dataset.recordCount < 1000
}

function RowLevelAccessSection({ dataset }: { dataset: Dataset }) {
  const applicable = qualifiesForRowLevel(dataset)

  return (
    <section aria-labelledby="access-rowlevel-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="access-rowlevel-heading"
        title="Row-level access"
        caption="Enabled when this dataset grants individual-record access scoped to subject consent."
      />
      <Surface radius="xl" className="p-4">
        {applicable ? (
          <p className="text-[12px] leading-relaxed text-v2-muted">
            Row-level consent enforcement is configured for this dataset. Privacy unit:{' '}
            <span className="font-mono text-v2-foreground/80">borrower_did</span>. Consent counts
            per counterparty appear once connected.
          </p>
        ) : (
          <p className="text-[12px] leading-relaxed text-v2-muted">
            Row-level access policies aren&apos;t applicable to this dataset (aggregation-only).
            Counterparties receive computed result sets — raw row values never leave the vault.
          </p>
        )}
      </Surface>
    </section>
  )
}

// ── 5. Audit stub ─────────────────────────────────────────────────────────────

function AuditStubSection({ vaultId, datasetId }: { vaultId: string; datasetId: string }) {
  return (
    <section aria-labelledby="access-audit-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="access-audit-heading"
        title="Audit"
        caption="Every access grant, template run, and policy change is logged."
      />
      <Surface radius="xl" className="flex items-center gap-3 p-4">
        <ShieldCheck
          className="h-4 w-4 shrink-0 text-v2-success/70"
          strokeWidth={1.75}
          aria-hidden
        />
        <p className="text-[12px] text-v2-muted">
          See the{' '}
          <Link
            href={`/v2/vaults/${vaultId}/activity?dataset=${datasetId}`}
            className="text-v2-foreground/80 underline underline-offset-2 transition-colors hover:text-v2-foreground"
          >
            activity log
          </Link>{' '}
          for the immutable audit trail.
        </p>
      </Surface>
    </section>
  )
}

// ── Main: AccessPanel ─────────────────────────────────────────────────────────

interface AccessPanelProps {
  vault: Vault
  dataset: Dataset
}

export function AccessPanel({ vault, dataset }: AccessPanelProps) {
  const access: DatasetAccess | undefined = datasetAccess[dataset.id]
  const family = getPaletteFamily(vault.palette)

  if (!access) {
    return (
      <div className="flex min-h-[24vh] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="text-[13px] text-v2-muted">
          No access configuration found for this dataset.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Privacy posture banner */}
      <PrivacyPostureBanner access={access} analysisRule={dataset.analysisRule} family={family} />

      {/* 2. Template catalog */}
      <TemplatesCatalog templates={access.templates} />

      {/* 3. Counterparty access grants */}
      <CounterpartyAccessSection grants={access.grants} templates={access.templates} />

      {/* 4. Row-level access (conditional) */}
      <RowLevelAccessSection dataset={dataset} />

      {/* 5. Audit stub */}
      <AuditStubSection vaultId={vault.id} datasetId={dataset.id} />
    </div>
  )
}
