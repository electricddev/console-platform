import type { User } from '@/lib/api/types'

const NOW = new Date('2026-05-08T09:00:00Z').toISOString()

export const userFixtures: User[] = [
  {
    id: 'usr_maya',
    name: 'Maya Chen',
    email: 'maya@gauntlet.xyz',
    role: 'counterparty',
    orgId: 'org_gauntlet',
    signingKey: '0x' + '7a'.repeat(20),
    lastLoginAt: NOW,
  },
  {
    id: 'usr_tom',
    name: 'Tom Werner',
    email: 'tom@maple-tf.xyz',
    role: 'originator',
    orgId: 'org_tradefin',
    signingKey: '0x' + 'c4'.repeat(20),
    lastLoginAt: NOW,
  },
  {
    id: 'usr_admin',
    name: 'Demo Admin',
    email: 'admin@hyve.xyz',
    role: 'admin',
    orgId: 'org_gauntlet',
    signingKey: '0x' + 'ff'.repeat(20),
    lastLoginAt: NOW,
  },
]

/** The three /login buttons map to these three personas by id. */
export const DEMO_PERSONA_IDS = {
  counterparty: 'usr_maya',
  originator: 'usr_tom',
  admin: 'usr_admin',
} as const
