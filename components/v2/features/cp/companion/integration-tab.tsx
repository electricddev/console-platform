'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCompanionContext } from './companion-context'
import {
  generateCode,
  shikiLang,
  type IntegrationLanguage,
  type PayloadField,
} from './integration-codegen'
import { PayloadContractTable } from './payload-contract-table'
import { parseSelectColumns, extractLineageRefs } from '@/components/v2/features/cp/analysis-workbench'

const LANGS: { value: IntegrationLanguage; label: string }[] = [
  { value: 'solidity', label: 'Solidity' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'curl', label: 'curl' },
]

function abiTypeFor(sqlType: string | null | undefined): string {
  if (!sqlType) return 'bytes32'
  const t = sqlType.toUpperCase()
  if (t === 'TIMESTAMP') return 'uint64'
  if (t === 'NUMERIC') return 'uint256'
  if (t === 'INT' || t === 'INTEGER') return 'uint64'
  if (t === 'TEXT') return 'string'
  if (t === 'BOOL' || t === 'BOOLEAN') return 'bool'
  return 'bytes32'
}

export function IntegrationTab() {
  const { code, vault, onchainDests, name } = useCompanionContext()
  const [lang, setLang] = useState<IntegrationLanguage>('solidity')
  const [destIndex, setDestIndex] = useState(0)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fields = useMemo<PayloadField[]>(() => {
    const cols = parseSelectColumns(code, vault)
    return cols.map((c) => {
      const lineage = extractLineageRefs(c.expression, vault)
      const source = lineage[0]?.label ?? 'derived'
      const sqlType = c.type ?? 'TEXT'
      return {
        name: c.alias,
        sqlType,
        abiType: abiTypeFor(c.type),
        exampleSql:
          sqlType === 'TIMESTAMP' ? '2026-05-15T14:22:18Z' :
          sqlType === 'NUMERIC' ? '1.024500' :
          sqlType === 'INT' || sqlType === 'INTEGER' ? '47' :
          'fresh',
        exampleAbi:
          sqlType === 'TIMESTAMP' ? '1715789138' :
          sqlType === 'NUMERIC' ? '1024500000000000000' :
          sqlType === 'INT' || sqlType === 'INTEGER' ? '47' :
          '0x66726573680000…',
        source,
      }
    })
  }, [code, vault])

  const dest = onchainDests[destIndex] ?? null
  const slug = name.trim() || 'analysis_name'
  const source = generateCode(lang, fields, {
    analysisSlug: slug,
    contractAddress: dest?.address,
    contractLabel: dest?.label,
  })

  // Lazy-load Shiki only when this tab mounts.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { codeToHtml } = await import('shiki')
        const html = await codeToHtml(source, { lang: shikiLang(lang), theme: 'github-dark' })
        if (!cancelled) setHighlighted(html)
      } catch {
        if (!cancelled) setHighlighted(null)
      }
    })()
    return () => { cancelled = true }
  }, [source, lang])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <PayloadContractTable fields={fields} />

      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Language" className="flex items-center gap-1">
          {LANGS.map((l) => (
            <button
              key={l.value}
              role="tab"
              aria-selected={lang === l.value}
              tabIndex={lang === l.value ? 0 : -1}
              onClick={() => setLang(l.value)}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10.5px] transition-colors',
                lang === l.value
                  ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                  : 'text-v2-muted hover:text-v2-foreground',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onchainDests.length > 1 && (
            <label className="font-mono text-[10px] text-v2-muted">
              Destination{' '}
              <select
                value={destIndex}
                onChange={(e) => setDestIndex(parseInt(e.target.value, 10))}
                className="rounded border border-v2-border/60 bg-transparent px-1 py-0.5 font-mono text-[10px] text-v2-foreground"
              >
                {onchainDests.map((d, i) => (
                  <option key={i} value={i}>{d.label || d.address.slice(0, 8) + '…'}</option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-v2-muted/60 transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-v2-success" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      </div>

      {highlighted ? (
        <div
          className="overflow-x-auto rounded-lg border border-v2-border/60 text-[11px] [&_pre]:!bg-transparent [&_pre]:!p-4"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="overflow-x-auto rounded-lg border border-v2-border/60 p-4 font-mono text-[10.5px] leading-relaxed text-v2-foreground whitespace-pre">
          {source}
        </pre>
      )}
    </div>
  )
}
