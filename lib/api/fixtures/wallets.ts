import type { Wallet } from '@/lib/api/types'

export const walletFixtures: Wallet[] = [
  { id: 'w_1', label: 'Primary signer', address: '0x' + 'a'.repeat(40), kind: 'hardware', isPrimary: true, addedAt: '2025-08-01T10:00:00Z' },
  { id: 'w_2', label: 'CI signer', address: '0x' + 'b'.repeat(40), kind: 'hot', isPrimary: false, addedAt: '2025-12-15T12:00:00Z' },
]
