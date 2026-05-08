import { mockQuery } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { StatusReportSchema } from '@/lib/api/schemas'
import type { StatusReport } from '@/lib/api/types'

export const getStatus = mockQuery<StatusReport>(
  () => StatusReportSchema.parse(fixtures.status),
  { latencyMs: 60 }
)
