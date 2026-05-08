import type { ApiKey } from '@/lib/api/types'

export const apiKeyFixtures: ApiKey[] = [
  { id: 'ak_1', label: 'Production reader', prefix: 'hyve_pk_live_', scopes: ['read'], createdAt: '2025-09-01T10:00:00Z', lastUsedAt: new Date().toISOString() },
  { id: 'ak_2', label: 'CI runner', prefix: 'hyve_pk_test_', scopes: ['read', 'execute'], createdAt: '2025-11-10T08:00:00Z', lastUsedAt: new Date(Date.now() - 3600_000).toISOString() },
]
