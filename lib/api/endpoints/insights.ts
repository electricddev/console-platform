import { mockQuery, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { AIInsightSchema } from '@/lib/api/schemas'
import type { AIInsight } from '@/lib/api/types'

export const getCounterpartyInsights = mockQuery(
  (ctx: RequestContext): AIInsight[] => {
    void ctx
    return fixtures.insights.map((i) => AIInsightSchema.parse(i))
  },
  { latencyMs: 160 }
)
