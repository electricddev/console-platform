import type { Member } from '@/lib/api/types'

export const memberFixtures: Member[] = [
  { id: 'mb_1', userId: 'usr_maya', name: 'Maya Chen', email: 'maya@gauntlet.xyz', role: 'admin', invitedAt: '2025-08-01T10:00:00Z', acceptedAt: '2025-08-01T11:00:00Z' },
  { id: 'mb_2', userId: 'usr_jules', name: 'Jules Park', email: 'jules@gauntlet.xyz', role: 'analyst', invitedAt: '2025-09-12T10:00:00Z', acceptedAt: '2025-09-12T14:00:00Z' },
  { id: 'mb_3', userId: 'usr_sam', name: 'Sam Diaz', email: 'sam@gauntlet.xyz', role: 'viewer', invitedAt: '2026-01-20T10:00:00Z' },
]
