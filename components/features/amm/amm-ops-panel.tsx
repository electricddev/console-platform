'use client'
import { useEffect, useReducer } from 'react'
import type { AmmFeed } from '@/lib/api/schemas'
import { LiveNavTile } from './live-nav-tile'
import { InventoryTile } from './inventory-tile'
import { FreshnessSlaTile } from './freshness-sla-tile'
import { SwapCapacityTile } from './swap-capacity-tile'
import { CounterfactualCalculator } from './counterfactual-calculator'
import { AnomalyFeed } from '@/components/features/brief/anomaly-feed'

type State = AmmFeed
type Action = { type: 'tick' }

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      // Deterministic base step of ±0.05 plus random jitter — ensures non-zero change per tick
      const sign = Math.random() >= 0.5 ? 1 : -1
      const jitter = sign * (0.05 + Math.random() * 0.02)
      const nav = +(state.navPerToken + jitter).toFixed(2)
      const fresh = Math.min(120, state.freshnessSeconds + 1)
      return { ...state, navPerToken: nav, freshnessSeconds: fresh }
    }
  }
}

export function AmmOpsPanel({ initial }: { initial: AmmFeed }) {
  const [state, dispatch] = useReducer(reduce, initial)
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 5_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid gap-6">
      <header>
        <h2 className="text-xl font-medium">AMM Operations <span className="text-xs text-muted-foreground">(demo)</span></h2>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div aria-label="NAV per token"><LiveNavTile navPerToken={state.navPerToken} navCI95={state.navCI95} freshnessSeconds={state.freshnessSeconds} /></div>
        <InventoryTile inventoryAsset={state.inventoryAsset} inventoryQuote={state.inventoryQuote} />
        <FreshnessSlaTile freshnessSeconds={state.freshnessSeconds} />
        <SwapCapacityTile maxSwapSize={state.maxSwapSize} capacityGate={state.capacityGate} />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        24h: {state.last24h.swapCount} swaps · ${(state.last24h.swapVolume / 1e6).toFixed(1)}M · {state.last24h.revertCount} reverts · Sharpe {state.last24h.sharpe.toFixed(1)}
      </p>
      <CounterfactualCalculator inventoryAsset={state.inventoryAsset} initialCI={state.navCI95} />
      <AnomalyFeed events={state.anomalyStream} title="// amm anomaly stream" />
    </div>
  )
}
