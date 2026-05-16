'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as issuers from '@/lib/api/endpoints/issuers'
import type { IssuerRequestKind } from '@/lib/api/schemas'

export async function actionSubmitIssuerRequest(payload: { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }) {
  const session = await requireUser()
  await issuers.submitIssuerRequest({ user: session }, payload)
  revalidatePath(`/legacy/issuers/${payload.issuerId}`)
  revalidatePath('/legacy/issuers')
}
