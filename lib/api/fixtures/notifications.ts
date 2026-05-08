import type { Notification } from '@/lib/api/types'

const ts = (offsetMin: number) =>
  new Date(Date.now() - offsetMin * 60_000).toISOString()

export const notificationFixtures: Notification[] = [
  {
    id: 'ntf_001',
    createdAt: ts(8),
    read: false,
    kind: 'attestation-published',
    title: 'New attestation on mF-ONE',
    body: 'Maple Trade Finance published a fresh completeness attestation.',
    severity: 'info',
    resourceType: 'dataset',
    resourceId: 'ds_mfone',
    href: '/datasets/ds_mfone',
  },
  {
    id: 'ntf_002',
    createdAt: ts(35),
    read: false,
    kind: 'completeness-alert',
    title: 'Completeness dipped to 87% on mF-ONE',
    body: 'Streaming ingestion gap detected at 14:00 UTC.',
    severity: 'warning',
    resourceType: 'dataset',
    resourceId: 'ds_mfone',
    href: '/datasets/ds_mfone',
  },
  {
    id: 'ntf_003',
    createdAt: ts(180),
    read: true,
    kind: 'approval-requested',
    title: 'Gauntlet requested a new template',
    body: '"Concentration breaches by sector" is awaiting your review.',
    severity: 'info',
    resourceType: 'approval',
    resourceId: 'apv_001',
    href: '/approvals/apv_001',
  },
]
