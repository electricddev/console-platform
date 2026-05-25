'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ModalActionBar } from '../modal-action-bar'
import { connectorById } from '../../catalog-data'
import type { DiscoveredDataset } from '../setup-reducer'

type DiscoveryProfile = {
  steps: { id: string; label: string; duration: number }[]
  result: DiscoveredDataset[]
}

const PROFILES: Record<string, DiscoveryProfile> = {
  s3: {
    steps: [
      { id: 'connect', label: 'Connecting to bucket', duration: 550 },
      { id: 'list', label: 'Listing prefixes', duration: 700 },
      { id: 'sample', label: 'Sampling schemas', duration: 850 },
      { id: 'count', label: 'Counting objects', duration: 600 },
    ],
    result: [
      {
        id: 'borrower_packets',
        name: 'borrower_packets',
        subtitle: 'PDFs · 187K objects',
        rowCount: 187_000,
        rowUnit: 'objects',
      },
      {
        id: 'covenant_attestations',
        name: 'covenant_attestations',
        subtitle: 'JSON · 1.4K objects',
        rowCount: 1_400,
        rowUnit: 'objects',
      },
    ],
  },
  'sec-edgar': {
    steps: [
      { id: 'connect', label: 'Connecting to EDGAR PDS', duration: 650 },
      { id: 'index', label: 'Indexing 12,847 registrants', duration: 700 },
      {
        id: 'resolve',
        label: 'Resolving series and class identifiers',
        duration: 500,
      },
      {
        id: 'count',
        label: 'Counting 4.7M filings across 8 forms',
        duration: 750,
      },
      { id: 'load', label: 'Loading dataset definitions', duration: 400 },
    ],
    result: [
      {
        id: 'form_n_port',
        name: 'Form N-PORT',
        subtitle: 'Monthly · 60d lag',
        rowCount: 284_567,
        rowUnit: 'filings',
      },
      {
        id: 'form_n_csr',
        name: 'Form N-CSR / N-CSRS',
        subtitle: 'Semi-annual',
        rowCount: 412_108,
        rowUnit: 'filings',
      },
      {
        id: 'form_n_cen',
        name: 'Form N-CEN',
        subtitle: 'Annual',
        rowCount: 97_433,
        rowUnit: 'filings',
      },
      {
        id: 'form_n_2',
        name: 'Form N-2',
        subtitle: 'Event-driven',
        rowCount: 8_421,
        rowUnit: 'filings',
      },
      {
        id: 'xbrl_financials',
        name: 'XBRL Financial Statements',
        subtitle: 'Continuous',
        rowCount: 2_341_067,
        rowUnit: 'tags',
      },
    ],
  },
  'file-upload': {
    steps: [
      { id: 'parse', label: 'Parsing file', duration: 600 },
      { id: 'infer', label: 'Inferring schema', duration: 700 },
    ],
    result: [
      {
        id: 'upload_default',
        name: 'Uploaded file',
        subtitle: 'Inferred schema',
        rowCount: 0,
        rowUnit: 'rows',
      },
    ],
  },
  stripe: {
    steps: [
      { id: 'connect', label: 'Connecting to Stripe', duration: 500 },
      { id: 'list', label: 'Listing endpoints', duration: 600 },
      { id: 'sample', label: 'Sampling schemas', duration: 800 },
      { id: 'count', label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      {
        id: 'charges',
        name: 'charges',
        subtitle: 'rows · 187K / mo',
        rowCount: 187_240,
        rowUnit: 'rows',
      },
      {
        id: 'invoices',
        name: 'invoices',
        subtitle: 'rows · 12K / mo',
        rowCount: 12_410,
        rowUnit: 'rows',
      },
      {
        id: 'customers',
        name: 'customers',
        subtitle: 'rows · 4K / mo',
        rowCount: 4_120,
        rowUnit: 'rows',
      },
      {
        id: 'refunds',
        name: 'refunds',
        subtitle: 'rows · 1K / mo',
        rowCount: 980,
        rowUnit: 'rows',
      },
      {
        id: 'subscriptions',
        name: 'subscriptions',
        subtitle: 'rows · 2K / mo',
        rowCount: 1_950,
        rowUnit: 'rows',
      },
    ],
  },
  plaid: {
    steps: [
      { id: 'connect', label: 'Connecting to Plaid', duration: 500 },
      { id: 'item', label: 'Resolving item', duration: 600 },
      {
        id: 'sample',
        label: 'Sampling balances and transactions',
        duration: 800,
      },
    ],
    result: [
      {
        id: 'transactions',
        name: 'transactions',
        subtitle: 'rows · 38K / mo',
        rowCount: 38_290,
        rowUnit: 'rows',
      },
      {
        id: 'balances',
        name: 'balances',
        subtitle: '2 accounts',
        rowCount: 412,
        rowUnit: 'rows',
      },
    ],
  },
  quickbooks: {
    steps: [
      {
        id: 'connect',
        label: 'Connecting to QuickBooks Online',
        duration: 500,
      },
      { id: 'realm', label: 'Resolving realm', duration: 500 },
      { id: 'sample', label: 'Sampling books', duration: 800 },
      { id: 'count', label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      {
        id: 'invoices',
        name: 'invoices',
        subtitle: 'rows · 8K / mo',
        rowCount: 8_120,
        rowUnit: 'rows',
      },
      {
        id: 'expenses',
        name: 'expenses',
        subtitle: 'rows · 15K / mo',
        rowCount: 14_890,
        rowUnit: 'rows',
      },
    ],
  },
  xero: {
    steps: [
      { id: 'connect', label: 'Connecting to Xero', duration: 500 },
      { id: 'tenant', label: 'Resolving tenant', duration: 500 },
      { id: 'sample', label: 'Sampling books', duration: 800 },
      { id: 'count', label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      {
        id: 'invoices',
        name: 'invoices',
        subtitle: 'rows · 6K / mo',
        rowCount: 6_240,
        rowUnit: 'rows',
      },
      {
        id: 'expenses',
        name: 'expenses',
        subtitle: 'rows · 11K / mo',
        rowCount: 11_020,
        rowUnit: 'rows',
      },
    ],
  },
}

type Props = {
  connectorId: string
  onComplete: (discovered: DiscoveredDataset[]) => void
  onCancel: () => void
  stepIndicator?: string
}

export function DiscoverStep({ connectorId, onComplete, onCancel }: Props) {
  const profile = PROFILES[connectorId]
  const def = connectorById(connectorId)
  const [activeIndex, setActiveIndex] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!profile) {
      onComplete([])
      return
    }
    if (activeIndex >= profile.steps.length) {
      const t = setTimeout(() => onComplete(profile.result), 320)
      return () => clearTimeout(t)
    }
    const t = setTimeout(
      () => setActiveIndex((i) => i + 1),
      profile.steps[activeIndex].duration,
    )
    return () => clearTimeout(t)
  }, [activeIndex, profile, onComplete])

  if (!profile) {
    return <p className="px-7 py-5 text-sm text-v2-muted">No discovery profile.</p>
  }

  const allDone = activeIndex >= profile.steps.length
  const providerName = def?.name ?? connectorId

  return (
    <>
      {/* Stage — checklist is the hero */}
      <div className="flex-1 px-7 pt-7 pb-6" aria-live="polite" aria-atomic="false">
        <p className="text-[13px] text-v2-muted">
          Reading {providerName} endpoints, sampling schemas…
        </p>

        {/* Step list */}
        <ul className="mt-6 flex flex-col gap-0">
          {profile.steps.map((s, i) => {
            const isDone = i < activeIndex || allDone
            const isActive = i === activeIndex && !allDone
            return (
              <motion.li
                key={s.id}
                initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: i * 0.04 }}
                className={cn(
                  'flex items-center gap-3 py-[7px] text-[13.5px] transition-colors',
                  isDone
                    ? 'text-v2-muted'
                    : isActive
                      ? 'text-v2-foreground'
                      : 'text-v2-muted/40',
                )}
              >
                {/* State icon — 20px container */}
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {isDone ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-v2-green/15 text-v2-green">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                  ) : isActive ? (
                    <Loader2
                      className="size-4 animate-spin text-v2-green"
                      strokeWidth={2}
                    />
                  ) : (
                    <span className="size-2 rounded-full border border-v2-muted/25" />
                  )}
                </span>
                <span>{s.label}</span>
              </motion.li>
            )
          })}
        </ul>
      </div>

      {/* Action bar — single Cancel on left */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground">
            Cancel
          </Button>
        }
      />
    </>
  )
}
