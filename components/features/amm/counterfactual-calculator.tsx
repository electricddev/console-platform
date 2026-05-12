'use client'
import { useState } from 'react'

const K = 5  // sensitivity constant — higher CI shrinks capacity faster

function maxSwap(inventoryAsset: number, ci: number): number {
  return Math.max(0, inventoryAsset * Math.max(0, 1 - K * ci))
}

const fmt = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export function CounterfactualCalculator({
  inventoryAsset, initialCI = 0.002,
}: { inventoryAsset: number; initialCI?: number }) {
  const [ci, setCI] = useState(initialCI)
  const withHyve = maxSwap(inventoryAsset, ci)
  const withoutHyve = maxSwap(inventoryAsset, ci * 10)
  return (
    <section className="rounded-lg border border-border bg-surface/40 p-4">
      <h3 className="font-tag text-foreground/60">{'// counterfactual capacity'}</h3>
      <label className="mt-3 block text-xs">
        <span>NAV confidence interval: <span className="tabular-nums">{(ci * 100).toFixed(2)}%</span></span>
        <input
          aria-label="NAV confidence interval"
          type="range" min={0.0005} max={0.02} step={0.0005}
          value={ci} onChange={(e) => setCI(parseFloat(e.target.value))}
          className="mt-2 block w-full"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">With Hyve-verified NAV</p>
          <p className="text-2xl font-medium tabular-nums" data-testid="max-with-hyve">{fmt(withHyve)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Without Hyve verification</p>
          <p className="text-2xl font-medium tabular-nums text-muted-foreground" data-testid="max-without-hyve">{fmt(withoutHyve)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Illustrative — fixed sensitivity constant k={K}.</p>
    </section>
  )
}
