'use client'

import { cn } from '@/lib/utils'
import { authSchemaFor } from './field-schemas'

type Props = {
  connectorId: string
  values: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AuthStep({ connectorId, values, onUpdate, onSubmit, onCancel }: Props) {
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
          <Btn onClick={onCancel} tone="secondary">Cancel</Btn>
          <Btn onClick={onSubmit}>Continue</Btn>
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
        <Btn onClick={onCancel} tone="secondary" buttonType="button">Cancel</Btn>
        <Btn onClick={onSubmit} disabled={!valid} buttonType="submit">Continue</Btn>
      </div>
    </form>
  )
}

function Btn({ children, onClick, disabled, tone, buttonType }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: 'secondary'; buttonType?: 'submit' | 'button' }) {
  return (
    <button
      type={buttonType ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md border px-3 py-1.5 text-[12px] transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        tone === 'secondary'
          ? 'border-v2-border text-v2-muted hover:text-v2-foreground'
          : disabled
            ? 'cursor-not-allowed border-v2-border bg-v2-surface-2 text-v2-muted'
            : 'border-v2-foreground bg-v2-foreground text-v2-background hover:bg-v2-foreground/90',
      )}
    >
      {children}
    </button>
  )
}
