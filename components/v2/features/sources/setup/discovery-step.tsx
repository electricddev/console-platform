'use client'

import { useEffect, useState } from 'react'
import { Check, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveredDataset } from './setup-reducer'

type DiscoveryProfile = {
  steps: { id: string; label: string; duration: number }[]
  result: DiscoveredDataset[]
}

const PROFILES: Record<string, DiscoveryProfile> = {
  's3': {
    steps: [
      { id: 'connect', label: 'Connecting to bucket', duration: 550 },
      { id: 'list', label: 'Listing prefixes', duration: 700 },
      { id: 'sample', label: 'Sampling schemas', duration: 850 },
      { id: 'count', label: 'Counting objects', duration: 600 },
    ],
    result: [
      { id: 'borrower_packets', name: 'borrower_packets', subtitle: 'PDFs · 187K objects', rowCount: 187_000, rowUnit: 'objects' },
      { id: 'covenant_attestations', name: 'covenant_attestations', subtitle: 'JSON · 1.4K objects', rowCount: 1_400, rowUnit: 'objects' },
    ],
  },
  'sec-edgar': {
    steps: [
      { id: 'connect', label: 'Connecting to EDGAR PDS', duration: 650 },
      { id: 'index', label: 'Indexing 12,847 registrants', duration: 700 },
      { id: 'resolve', label: 'Resolving series and class identifiers', duration: 500 },
      { id: 'count', label: 'Counting 4.7M filings across 8 forms', duration: 750 },
      { id: 'load', label: 'Loading dataset definitions', duration: 400 },
    ],
    result: [
      { id: 'form_n_port', name: 'Form N-PORT', subtitle: 'Monthly · 60d lag', rowCount: 284_567, rowUnit: 'filings' },
      { id: 'form_n_csr', name: 'Form N-CSR / N-CSRS', subtitle: 'Semi-annual', rowCount: 412_108, rowUnit: 'filings' },
      { id: 'form_n_cen', name: 'Form N-CEN', subtitle: 'Annual', rowCount: 97_433, rowUnit: 'filings' },
      { id: 'form_n_2', name: 'Form N-2', subtitle: 'Event-driven', rowCount: 8_421, rowUnit: 'filings' },
      { id: 'xbrl_financials', name: 'XBRL Financial Statements', subtitle: 'Continuous', rowCount: 2_341_067, rowUnit: 'tags' },
    ],
  },
  'file-upload': {
    steps: [
      { id: 'parse', label: 'Parsing file', duration: 600 },
      { id: 'infer', label: 'Inferring schema', duration: 700 },
    ],
    result: [
      { id: 'upload_default', name: 'Uploaded file', subtitle: 'Inferred schema', rowCount: 0, rowUnit: 'rows' },
    ],
  },
}

type Props = {
  connectorId: string
  onComplete: (discovered: DiscoveredDataset[]) => void
  onCancel: () => void
}

export function DiscoveryStep({ connectorId, onComplete, onCancel }: Props) {
  const profile = PROFILES[connectorId]
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!profile) {
      onComplete([])
      return
    }
    if (activeIndex >= profile.steps.length) {
      const t = setTimeout(() => onComplete(profile.result), 320)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), profile.steps[activeIndex].duration)
    return () => clearTimeout(t)
  }, [activeIndex, profile, onComplete])

  if (!profile) {
    return <p className="text-sm text-v2-muted">No discovery profile.</p>
  }

  const allDone = activeIndex >= profile.steps.length
  const progress = Math.min(activeIndex / profile.steps.length, 1)

  return (
    <div className="flex flex-col gap-3" aria-live="polite" aria-atomic="false">
      <ul className="grid gap-1.5">
        {profile.steps.map((s, i) => {
          const isDone = i < activeIndex || allDone
          const isActive = i === activeIndex && !allDone
          return (
            <li
              key={s.id}
              className={cn(
                'flex items-center gap-2 text-[12.5px] transition-colors',
                isDone || isActive ? 'text-v2-foreground' : 'text-v2-muted/45',
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isDone ? (
                  <Check className="size-3.5 text-v2-foreground" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2 className="size-3.5 animate-spin text-v2-foreground" />
                ) : (
                  <Circle className="size-2.5 text-v2-muted/40" strokeWidth={1.5} />
                )}
              </span>
              <span>{s.label}</span>
            </li>
          )
        })}
      </ul>
      <div
        className="h-px w-full overflow-hidden bg-v2-border"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-px bg-v2-foreground transition-[width] duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
