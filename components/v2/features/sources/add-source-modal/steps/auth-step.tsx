'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authSchemaFor } from '../field-schemas'
import { connectorById, WORDMARK_TONES } from '../../catalog-data'
import { ModalActionBar } from '../modal-action-bar'

type Props = {
  connectorId: string
  values: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  onSubmit: () => void
  onCancel: () => void
  onOAuthRequest: () => void
  stepIndicator?: string
}

export function AuthStep(props: Props) {
  if (isOAuthConnector(props.connectorId)) return <OAuthShape {...props} />
  if (props.connectorId === 'file-upload') return <FileUploadShape {...props} />
  return <FormShape {...props} />
}

const OAUTH_CONNECTORS = new Set(['stripe', 'plaid', 'quickbooks', 'xero'])
function isOAuthConnector(id: string) {
  return OAUTH_CONNECTORS.has(id)
}

// Human-readable copy per OAuth provider
const OAUTH_COPY: Record<string, { name: string; description: string }> = {
  stripe: {
    name: 'Stripe',
    description:
      "You'll be redirected to Stripe to grant Hyve read access to your account. We bring you back here as soon as you approve.",
  },
  plaid: {
    name: 'Plaid',
    description:
      "You'll be redirected to Plaid to grant Hyve read access to your linked bank accounts. We bring you back as soon as you approve.",
  },
  quickbooks: {
    name: 'QuickBooks',
    description:
      "You'll be redirected to QuickBooks to grant Hyve read access to your company data. We bring you back here as soon as you approve.",
  },
  xero: {
    name: 'Xero',
    description:
      "You'll be redirected to Xero to grant Hyve read access to your organisation. We bring you back here as soon as you approve.",
  },
}

function OAuthShape({ connectorId, onOAuthRequest, onCancel, stepIndicator }: Props) {
  const def = connectorById(connectorId)
  const copy = OAUTH_COPY[connectorId] ?? { name: connectorId, description: '' }

  return (
    <>
      {/* Stage — left-aligned hero */}
      <div className="flex-1 px-7 pt-9 pb-6">
        {/* Provider wordmark / logo — left, small */}
        {def?.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex size-12 items-center justify-center rounded-lg font-mono text-[13px] font-semibold',
              WORDMARK_TONES[def.logo.tone],
            )}
          >
            {def.logo.label}
          </span>
        ) : def?.logo.kind === 'icon' ? (
          <span className="inline-flex size-12 items-center justify-center rounded-lg bg-v2-surface-2">
            <def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} />
          </span>
        ) : null}

        {/* Provider name — big serif headline */}
        <h2 className="mt-5 font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.012em] text-v2-foreground">
          {def?.name ?? copy.name}
        </h2>
        {/* Tagline */}
        {def?.tagline ? (
          <div className="mt-1 text-[13px] text-v2-muted">{def.tagline}</div>
        ) : null}

        {/* Prose explanation */}
        <p className="mt-7 max-w-[44ch] text-[14px] text-v2-foreground/90 leading-[1.6]">
          {copy.description}
        </p>

        {/* Primary in-stage action — left-aligned */}
        <Button
          onClick={onOAuthRequest}
          variant="brand"
          size="default"
          className="mt-7"
        >
          Sign in with {copy.name}
        </Button>
      </div>

      {/* Action bar — Cancel on left, step indicator implicitly on right */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        }
        stepIndicator={stepIndicator}
      />
    </>
  )
}

function FileUploadShape({ onUpdate, onSubmit, onCancel, stepIndicator }: Props) {
  return (
    <>
      <div className="flex-1 px-7 pt-9 pb-6">
        <h2 className="font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.012em] text-v2-foreground">
          Upload a file
        </h2>
        <p className="mt-1 text-[13px] text-v2-muted">CSV · Parquet · JSON · up to 200 MB</p>

        <label className="mt-7 flex h-44 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-v2-border bg-v2-surface-2/40 text-center transition-colors hover:border-v2-foreground/40 hover:bg-v2-foreground/[0.02]">
          <span className="font-medium text-[13px] text-v2-foreground">
            Drop a file or click to upload
          </span>
          <span className="mt-1.5 text-[11.5px] text-v2-muted">
            CSV · Parquet · JSON · up to 200 MB
          </span>
          <input
            type="file"
            accept=".csv,.parquet,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              onUpdate({ label: f.name, size: f.size })
              onSubmit()
            }}
          />
        </label>
      </div>

      <ModalActionBar
        left={
          <Button variant="link" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
        }
        stepIndicator={stepIndicator}
      />
    </>
  )
}

function FormShape({ connectorId, values, onUpdate, onSubmit, onCancel, stepIndicator }: Props) {
  const schema = authSchemaFor(connectorId)
  if (!schema) return null

  const noFieldsDef = connectorById(connectorId)

  // SEC EDGAR has no fields — no credentials needed.
  if (schema.fields.length === 0) {
    return (
      <>
        <div className="flex-1 px-7 pt-9 pb-6">
          {/* Provider chip — left */}
          {noFieldsDef ? (
            <div className="flex items-center gap-3 mb-6">
              {noFieldsDef.logo.kind === 'wordmark' ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-12 items-center justify-center rounded-lg font-mono text-[13px] font-semibold shrink-0',
                    WORDMARK_TONES[noFieldsDef.logo.tone],
                  )}
                >
                  {noFieldsDef.logo.label}
                </span>
              ) : noFieldsDef.logo.kind === 'icon' ? (
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-v2-surface-2">
                  <noFieldsDef.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} />
                </span>
              ) : null}
              <div>
                <h2 className="font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.012em] text-v2-foreground">
                  {noFieldsDef.name}
                </h2>
                <p className="mt-0.5 text-[13px] text-v2-muted">{noFieldsDef.tagline}</p>
              </div>
            </div>
          ) : null}
          <p className="max-w-[44ch] text-[14px] text-v2-foreground/90 leading-[1.6]">
            SEC EDGAR is a public dataset and needs no credentials. Continue to
            discover available forms.
          </p>
        </div>
        <ModalActionBar
          left={
            <Button variant="link" size="sm" type="button" onClick={onCancel}>
              Cancel
            </Button>
          }
          right={
            <Button size="sm" variant="brand" onClick={onSubmit}>
              Continue
            </Button>
          }
          stepIndicator={stepIndicator}
        />
      </>
    )
  }

  const parseResult = schema.schema.safeParse(values)
  const valid = parseResult.success

  const formDef = connectorById(connectorId)

  return (
    <>
      {/* Left-aligned provider header + form */}
      <div className="flex-1 px-7 pt-9 pb-6">
        {formDef ? (
          <div className="flex items-center gap-3 mb-6">
            {formDef.logo.kind === 'wordmark' ? (
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-12 items-center justify-center rounded-lg font-mono text-[13px] font-semibold shrink-0',
                  WORDMARK_TONES[formDef.logo.tone],
                )}
              >
                {formDef.logo.label}
              </span>
            ) : formDef.logo.kind === 'icon' ? (
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-v2-surface-2">
                <formDef.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} />
              </span>
            ) : null}
            <div>
              <h2 className="font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.012em] text-v2-foreground">
                {formDef.name}
              </h2>
              <p className="mt-0.5 text-[13px] text-v2-muted">{formDef.tagline}</p>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSubmit()
          }}
          className="mt-2"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {schema.fields.map((f) => {
              const val = (values[f.key] as string) ?? ''
              const isFullWidth =
                f.type !== 'select' && (f.key === 'prefix' || f.key === 'label')
              return (
                <label
                  key={f.key}
                  className={cn('flex flex-col gap-1.5', isFullWidth && 'sm:col-span-2')}
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted/70">
                    {f.label}
                  </span>
                  {f.type === 'select' ? (
                    <Select value={val} onValueChange={(v) => onUpdate({ [f.key]: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options?.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <input
                      type={f.type === 'password' ? 'password' : 'text'}
                      value={val}
                      onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      className="rounded-md border border-v2-border bg-v2-surface px-3 py-2 text-[13px] text-v2-foreground placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
                    />
                  )}
                  {f.helper ? (
                    <span className="text-[10.5px] text-v2-muted">{f.helper}</span>
                  ) : null}
                </label>
              )
            })}
          </div>
          {/* hidden submit so Enter key works */}
          <button type="submit" className="sr-only" aria-hidden="true" />
        </form>
      </div>

      <ModalActionBar
        left={
          <Button variant="link" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
        }
        right={
          <Button
            type="button"
            size="sm"
            disabled={!valid}
            variant="brand"
            onClick={() => {
              if (valid) onSubmit()
            }}
          >
            Continue
          </Button>
        }
        stepIndicator={stepIndicator}
      />
    </>
  )
}
