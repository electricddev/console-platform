'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildAbiFragment, type PayloadField } from './integration-codegen'

export function PayloadContractTable({ fields }: { fields: PayloadField[] }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildAbiFragment(fields))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  if (fields.length === 0) {
    return (
      <p className="font-mono text-[11px] text-v2-muted">
        Add SELECT columns with aliases to derive the payload contract.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">Payload contract</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-v2-muted/60 transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-v2-success" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy ABI'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-v2-border/60">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-v2-border/60 bg-v2-foreground/[0.04]">
              <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-v2-muted">field</th>
              <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-v2-muted">type</th>
              <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-v2-muted">example</th>
              <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-v2-muted">source</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.name} className={cn('border-b border-v2-border/60 last:border-0 align-top')}>
                <td className="px-3 py-1.5 font-mono text-[11px] text-v2-foreground">{f.name}</td>
                <td className="px-3 py-1.5 font-mono text-[10.5px]">
                  <span className="text-v2-foreground">{f.abiType}</span>{' '}
                  <span className="text-v2-muted">/ {f.sqlType}</span>
                </td>
                <td className="px-3 py-1.5 font-mono text-[10.5px] tabular-nums text-v2-muted">{f.exampleSql}</td>
                <td className="px-3 py-1.5">
                  <span className="rounded bg-v2-foreground/[0.05] px-1 py-px font-mono text-[9.5px] text-v2-muted">{f.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
