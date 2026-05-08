import type { StatusReport } from '@/lib/api/types'

export const statusFixture: StatusReport = {
  overall: 'operational',
  components: [
    { name: 'TEE attestation', status: 'operational' },
    { name: 'On-chain anchor', status: 'operational' },
    { name: 'Ingestion', status: 'operational' },
  ],
  updatedAt: new Date().toISOString(),
}
