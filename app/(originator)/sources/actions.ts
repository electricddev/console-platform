'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const IdInput = z.object({ id: z.string().min(1) })

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function pauseConnection(id: string): Promise<ActionResult> {
  const parsed = IdInput.safeParse({ id })
  if (!parsed.success) return { ok: false, error: 'Invalid id' }
  // Fixture-based: no persistence layer in MVP. The toast is the affordance.
  revalidatePath('/sources')
  return { ok: true }
}

export async function resumeConnection(id: string): Promise<ActionResult> {
  const parsed = IdInput.safeParse({ id })
  if (!parsed.success) return { ok: false, error: 'Invalid id' }
  revalidatePath('/sources')
  return { ok: true }
}

const RemoveInput = z.object({ id: z.string().min(1), confirmName: z.string().min(1) })

export async function removeConnection(id: string, confirmName: string): Promise<ActionResult> {
  const parsed = RemoveInput.safeParse({ id, confirmName })
  if (!parsed.success) return { ok: false, error: 'Confirmation name required' }
  revalidatePath('/sources')
  return { ok: true }
}

const CreateInput = z.object({
  connectorId: z.string().min(1),
  name: z.string().min(2).max(80),
  // auth payload is connector-specific; serialized as JSON
  authPayload: z.record(z.unknown()).default({}),
  datasetIds: z.array(z.string()).default([]),
})

export async function createConnection(input: z.infer<typeof CreateInput>): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.message }
  const id = `conn_${parsed.data.connectorId}_${Math.random().toString(36).slice(2, 8)}`
  revalidatePath('/sources')
  return { ok: true, data: { id } }
}
