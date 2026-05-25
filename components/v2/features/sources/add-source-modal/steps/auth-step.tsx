'use client'

import { ArrowUpRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authSchemaFor } from '../field-schemas'
import { connectorById } from '../../catalog-data'
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
const OAUTH_COPY: Record<
  string,
  { name: string; description: string; reads: string[] }
> = {
  stripe: {
    name: 'Stripe',
    description:
      "You'll be redirected to Stripe to grant Hyve read access. We bring you back as soon as you approve.",
    reads: ['charges', 'invoices', 'customers', 'refunds', 'subscriptions'],
  },
  plaid: {
    name: 'Plaid',
    description:
      "You'll be redirected to Plaid to grant Hyve read access to your linked bank accounts.",
    reads: ['transactions', 'balances', 'accounts'],
  },
  quickbooks: {
    name: 'QuickBooks',
    description:
      "You'll be redirected to QuickBooks to grant Hyve read access to your company data.",
    reads: ['invoices', 'expenses', 'journal entries', 'customers', 'vendors'],
  },
  xero: {
    name: 'Xero',
    description:
      "You'll be redirected to Xero to grant Hyve read access to your organisation.",
    reads: ['invoices', 'expenses', 'journal entries', 'contacts'],
  },
}

function OAuthShape({ connectorId, onOAuthRequest, onCancel }: Props) {
  const copy = OAUTH_COPY[connectorId] ?? { name: connectorId, description: '', reads: [] }

  return (
    <>
      <div className="flex-1 px-7 pt-2 pb-6">
        {/* Body prose */}
        <p className="max-w-[52ch] text-[13.5px] text-v2-foreground/80 leading-[1.6]">
          {copy.description}
        </p>

        {/* Scope preview — what Hyve will read */}
        {copy.reads.length > 0 && (
          <div className="mt-6 rounded-xl border border-v2-border/60 bg-v2-surface-2/40 p-4">
            <div className="flex items-center gap-2">
              <Lock className="size-3 text-v2-muted/70" strokeWidth={2} />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-v2-muted/70">
                Read-only · scoped to
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {copy.reads.map((r) => (
                <span
                  key={r}
                  className="font-mono text-[11.5px] leading-none rounded-[5px] bg-v2-foreground/[0.06] text-v2-foreground/85 px-2 py-1.5"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Primary action */}
        <div className="mt-7 flex items-center gap-3">
          <Button
            onClick={onOAuthRequest}
            variant="brand"
            size="default"
            className="gap-1.5"
          >
            Continue to {copy.name}
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </Button>
          <span className="text-[11.5px] text-v2-muted/70">
            Opens in a secure popup.
          </span>
        </div>
      </div>

      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground px-0">
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
      <div className="flex-1 px-7 pt-7 pb-6">
        <label className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-v2-border/80 bg-v2-surface-2/30 text-center transition-all duration-150 hover:border-v2-foreground/30 hover:bg-v2-foreground/[0.02]">
          <span className="font-medium text-[13.5px] text-v2-foreground">
            Drop a file or click to upload
          </span>
          <span className="mt-2 text-[11.5px] text-v2-muted">
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
          <Button variant="link" size="sm" type="button" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground">
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
  if (schema.fields.length === 0) {
    return (
      <>
        <div className="flex-1 px-7 pt-7 pb-6">
          <p className="max-w-[44ch] text-[14px] text-v2-foreground/85 leading-[1.65]">
            SEC EDGAR is a public dataset and needs no credentials. Continue to
            discover available forms.
          </p>
        </div>
        <ModalActionBar
          left={
            <Button variant="link" size="sm" type="button" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground">
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

  return (
    <>
      <div className="flex-1 px-7 pt-7 pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSubmit()
          }}
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
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-v2-muted/70">
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
                      className="rounded-lg border border-v2-border bg-v2-surface-2/40 px-3 py-2.5 text-[13px] text-v2-foreground placeholder:text-v2-muted/50 transition-colors focus:bg-v2-surface-2/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
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
          <Button variant="link" size="sm" type="button" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground">
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
