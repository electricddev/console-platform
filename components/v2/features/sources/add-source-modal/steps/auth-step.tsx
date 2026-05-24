'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { authSchemaFor } from '../field-schemas'

type Props = {
  connectorId: string
  values: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  onSubmit: () => void
  onCancel: () => void
  onOAuthRequest: () => void   // for OAuth shape; opens Hyve Bridge
}

export function AuthStep(props: Props) {
  if (isOAuthConnector(props.connectorId)) return <OAuthShape {...props} />
  if (props.connectorId === 'file-upload') return <FileUploadShape {...props} />
  return <FormShape {...props} />
}

const OAUTH_CONNECTORS = new Set(['stripe', 'plaid', 'quickbooks', 'xero'])
function isOAuthConnector(id: string) { return OAUTH_CONNECTORS.has(id) }

function OAuthShape({ connectorId, onOAuthRequest, onCancel }: Props) {
  const NAME: Record<string, string> = {
    stripe: 'Stripe', plaid: 'Plaid', quickbooks: 'QuickBooks', xero: 'Xero',
  }
  const name = NAME[connectorId] ?? connectorId
  return (
    <div className="flex flex-col gap-4 px-1 pt-2">
      <p className="text-[12.5px] text-v2-muted leading-[1.55]">
        You'll be sent to a Hyve-hosted authorisation page to grant read access to your {name} account.
        We'll bring you back here as soon as you approve.
      </p>
      <Button
        onClick={onOAuthRequest}
        className="self-start bg-v2-green text-white hover:bg-v2-green-hover"
      >
        Sign in with {name} →
      </Button>
      <Button variant="link" size="sm" onClick={onCancel} className="self-start">Cancel</Button>
    </div>
  )
}

function FileUploadShape({ onUpdate, onSubmit, onCancel }: Props) {
  return (
    <div className="flex flex-col gap-3 px-1 pt-2">
      <label
        className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-v2-border bg-v2-surface-2/40 text-center text-[12.5px] text-v2-muted hover:border-v2-foreground/40"
      >
        <span className="font-medium text-v2-foreground">Drop a file or click to upload</span>
        <span className="mt-1 text-[11px]">CSV · Parquet · JSON · up to 200 MB</span>
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function FormShape({ connectorId, values, onUpdate, onSubmit, onCancel }: Props) {
  const schema = authSchemaFor(connectorId)
  if (!schema) return null

  // SEC EDGAR has no fields — skip auth straight through (handled by caller).
  if (schema.fields.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-v2-foreground">
          SEC EDGAR is a public dataset and needs no credentials. Continue to discover available forms.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-v2-green text-white hover:bg-v2-green-hover" onClick={onSubmit}>Continue</Button>
        </div>
      </div>
    )
  }

  const parseResult = schema.schema.safeParse(values)
  const valid = parseResult.success

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit() }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {schema.fields.map((f) => {
        const val = (values[f.key] as string) ?? ''
        const isFullWidth = f.type !== 'select' && (f.key === 'prefix' || f.key === 'label')
        return (
          <label key={f.key} className={cn('flex flex-col gap-1', isFullWidth && 'sm:col-span-2')}>
            <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">{f.label}</span>
            {f.type === 'select' ? (
              <select
                value={val}
                onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                className="rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12.5px] text-v2-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
              >
                <option value="">Choose…</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
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
            {f.helper ? <span className="text-[10px] text-v2-muted">{f.helper}</span> : null}
          </label>
        )
      })}
      <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          size="sm"
          disabled={!valid}
          className="bg-v2-green text-white hover:bg-v2-green-hover"
          onClick={onSubmit}
        >
          Continue
        </Button>
      </div>
    </form>
  )
}
