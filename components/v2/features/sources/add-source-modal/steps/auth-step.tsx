'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

function OAuthShape({ connectorId, onOAuthRequest, onCancel }: Props) {
  const def = connectorById(connectorId)
  const NAME: Record<string, string> = {
    stripe: 'Stripe',
    plaid: 'Plaid',
    quickbooks: 'QuickBooks',
    xero: 'Xero',
  }
  const name = NAME[connectorId] ?? connectorId

  return (
    <>
      {/* Stage — provider as hero */}
      <div className="flex flex-col items-center px-8 pt-7 pb-6 text-center">
        {/* Provider logo — 64px hero */}
        {def?.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-16 items-center justify-center rounded-xl font-mono text-[18px] font-semibold',
              WORDMARK_TONES[def.logo.tone],
            )}
          >
            {def.logo.label}
          </span>
        ) : def?.logo.kind === 'icon' ? (
          <span className="flex size-16 items-center justify-center rounded-xl bg-v2-surface-2">
            <def.logo.Icon className="size-7 text-v2-muted" strokeWidth={1.75} />
          </span>
        ) : null}

        {/* Provider name — explicit heading for a11y and E2E selectors */}
        <h2 className="mt-3 font-serif text-[24px] tracking-tight text-v2-foreground leading-none">
          {def?.name ?? name}
        </h2>
        {/* Tagline */}
        {def?.tagline ? (
          <div className="mt-1.5 text-[12.5px] text-v2-muted">{def.tagline}</div>
        ) : null}

        {/* Explanation */}
        <p className="mt-8 max-w-[380px] text-[13px] text-v2-foreground/85 leading-relaxed">
          You&rsquo;ll be redirected to a Hyve-hosted authorisation page to grant
          read access to your {name} account. We&rsquo;ll bring you back here.
        </p>

        {/* Primary in-stage action — default size, not sm */}
        <Button
          onClick={onOAuthRequest}
          variant="brand"
          size="default"
          className="mt-6"
        >
          Sign in with {name}
        </Button>
      </div>

      {/* Action bar — only Cancel on left, no right action (in-stage button IS primary) */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        }
      />
    </>
  )
}

function FileUploadShape({ onUpdate, onSubmit, onCancel }: Props) {
  return (
    <>
      <div className="px-6 pt-5 pb-2">
        <label className="flex h-44 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-v2-border bg-v2-surface-2/40 text-center transition-colors hover:border-v2-foreground/40 hover:bg-v2-foreground/[0.02]">
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
      />
    </>
  )
}

function FormShape({ connectorId, values, onUpdate, onSubmit, onCancel }: Props) {
  const schema = authSchemaFor(connectorId)
  if (!schema) return null

  // SEC EDGAR has no fields — no credentials needed.
  const noFieldsDef = connectorById(connectorId)
  if (schema.fields.length === 0) {
    return (
      <>
        {noFieldsDef ? (
          <div className="flex items-center gap-3 px-6 pt-5 pb-3">
            {noFieldsDef.logo.kind === 'wordmark' ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-9 items-center justify-center rounded-md font-mono text-[11px] font-semibold shrink-0',
                  WORDMARK_TONES[noFieldsDef.logo.tone],
                )}
              >
                {noFieldsDef.logo.label}
              </span>
            ) : noFieldsDef.logo.kind === 'icon' ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
                <noFieldsDef.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
              </span>
            ) : null}
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground leading-none">
                {noFieldsDef.name}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-v2-muted">{noFieldsDef.tagline}</p>
            </div>
          </div>
        ) : null}
        <div className="px-6 pb-2">
          <p className="text-[13px] text-v2-foreground leading-relaxed">
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
        />
      </>
    )
  }

  const parseResult = schema.schema.safeParse(values)
  const valid = parseResult.success

  const formDef = connectorById(connectorId)

  return (
    <>
      {/* Visible heading for a11y + test selectors (mirrors sr-only DialogTitle) */}
      {formDef ? (
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          {formDef.logo.kind === 'wordmark' ? (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-9 items-center justify-center rounded-md font-mono text-[11px] font-semibold shrink-0',
                WORDMARK_TONES[formDef.logo.tone],
              )}
            >
              {formDef.logo.label}
            </span>
          ) : formDef.logo.kind === 'icon' ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
              <formDef.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
            </span>
          ) : null}
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground leading-none">
              {formDef.name}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-v2-muted">{formDef.tagline}</p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit()
        }}
        className="px-6 pb-2"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {schema.fields.map((f) => {
            const val = (values[f.key] as string) ?? ''
            const isFullWidth =
              f.type !== 'select' && (f.key === 'prefix' || f.key === 'label')
            return (
              <label
                key={f.key}
                className={cn('flex flex-col gap-1', isFullWidth && 'sm:col-span-2')}
              >
                <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                  {f.label}
                </span>
                {f.type === 'select' ? (
                  <select
                    value={val}
                    onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                    className="rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12.5px] text-v2-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
                  >
                    <option value="">Choose…</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'password' ? 'password' : 'text'}
                    value={val}
                    onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12.5px] text-v2-foreground placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
                  />
                )}
                {f.helper ? (
                  <span className="text-[10px] text-v2-muted">{f.helper}</span>
                ) : null}
              </label>
            )
          })}
        </div>
        {/* hidden submit so Enter key works */}
        <button type="submit" className="sr-only" aria-hidden="true" />
      </form>

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
      />
    </>
  )
}
