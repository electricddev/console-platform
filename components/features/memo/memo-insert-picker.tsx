'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { acredMethodology } from '@/lib/data/acred/methodology'

type SectionKey = 'character' | 'capacity' | 'capital' | 'collateral' | 'conditions'

// Per-section methodology candidates by id.
const SECTION_CANDIDATES: Record<SectionKey, string[]> = {
  character:  [],
  capacity:   ['acred.nav_trend', 'acred.non_accrual_pct_over_time', 'acred.coupon_kind_mix'],
  capital:    ['acred.top10_borrowers', 'acred.sector_mix', 'acred.maturity_profile', 'acred.net_flow_over_time'],
  collateral: ['acred.first_lien_pct', 'acred.top10_concentration_pct', 'acred.top10_concentration_now_vs_prior'],
  conditions: ['acred.sector_mix', 'acred.geo_mix', 'acred.event_severity_mix', 'acred.event_frequency_by_month'],
}

export function MemoInsertPicker({
  sectionKey, onInsert,
}: { sectionKey: SectionKey; onInsert: (methodologyId: string) => void }) {
  const [open, setOpen] = useState(false)
  const candidates = SECTION_CANDIDATES[sectionKey]
    .map((id) => acredMethodology.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  if (candidates.length === 0) {
    return <p className="text-xs text-muted-foreground">No automated inserts available for this section.</p>
  }

  return (
    <div className="relative inline-block">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        Insert data
      </Button>
      {open && (
        <div className="absolute z-10 mt-2 w-80 rounded-md border border-border bg-surface p-2 shadow-lg">
          <ul className="grid gap-1">
            {candidates.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => { onInsert(m.id); setOpen(false) }}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
