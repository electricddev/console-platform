import type { AttestationDiscipline } from '@/lib/api/schemas'

export const acredAttestationDiscipline: AttestationDiscipline = {
  expectedLast30d: 30,
  deliveredLast30d: 30,
  onTimeLast30d: 28,
  lastGapAt: '2026-04-22T14:23:00.000Z',
  cadenceBreakdown: [
    { cadence: 'daily',     metric: 'NAV',                  delivered: 30, expected: 30, onTime: 30 },
    { cadence: 'weekly',    metric: 'Leverage attestation',  delivered:  4, expected:  4, onTime:  3 },
    { cadence: 'monthly',   metric: 'Composition',           delivered:  1, expected:  1, onTime:  1 },
    { cadence: 'quarterly', metric: 'SEC N-PORT recon',      delivered:  1, expected:  1, onTime:  1 },
  ],
}
