import type { ActiveSession } from '@/lib/api/types'

export const sessionFixtures: ActiveSession[] = [
  { id: 'sess_1', device: 'MacBook Pro · Chrome 130', ip: '203.0.113.4', city: 'New York', country: 'US', createdAt: new Date(Date.now() - 4 * 3600_000).toISOString(), lastSeenAt: new Date().toISOString(), current: true },
  { id: 'sess_2', device: 'iPhone 16 · Safari', ip: '198.51.100.21', city: 'New York', country: 'US', createdAt: new Date(Date.now() - 36 * 3600_000).toISOString(), lastSeenAt: new Date(Date.now() - 18 * 3600_000).toISOString(), current: false },
]
