import { z } from 'zod'
import { RoleSchema } from '@/lib/api/schemas'

export const sessionDataSchema = z.object({
  userId: z.string().optional(),
  orgId: z.string().optional(),
  role: RoleSchema.optional(),
  density: z.enum(['compact', 'comfortable']).optional(),
})
