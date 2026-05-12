import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveNavTile } from '@/components/features/amm/live-nav-tile'
import { InventoryTile } from '@/components/features/amm/inventory-tile'
import { FreshnessSlaTile } from '@/components/features/amm/freshness-sla-tile'
import { SwapCapacityTile } from '@/components/features/amm/swap-capacity-tile'

describe('AMM tiles', () => {
  it('LiveNavTile renders nav and CI', () => {
    render(<LiveNavTile navPerToken={100.42} navCI95={0.018} freshnessSeconds={3} />)
    expect(screen.getByText(/\$100\.42/)).toBeInTheDocument()
    expect(screen.getByText(/±\s*\$0\.018/)).toBeInTheDocument()
  })

  it('InventoryTile renders both inventories', () => {
    render(<InventoryTile inventoryAsset={4_200_000} inventoryQuote={2_800_000} />)
    expect(screen.getByText(/\$4\.2M ACRED/)).toBeInTheDocument()
    expect(screen.getByText(/\$2\.8M USDC/)).toBeInTheDocument()
  })

  it('FreshnessSlaTile shows SLA breach when freshness > 60s', () => {
    render(<FreshnessSlaTile freshnessSeconds={62} />)
    expect(screen.getByText(/SLA breach/i)).toBeInTheDocument()
  })

  it('SwapCapacityTile shows gate reason', () => {
    render(<SwapCapacityTile maxSwapSize={850_000} capacityGate="confidence" />)
    expect(screen.getByText(/gated by confidence/i)).toBeInTheDocument()
  })
})
