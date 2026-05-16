'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as memos from '@/lib/api/endpoints/memos'
import type { MemoSection, FlagDecision } from '@/lib/api/schemas'

type SectionKey = 'character' | 'capacity' | 'capital' | 'collateral' | 'conditions'

export async function actionUpdateMemoSection(memoId: string, sectionKey: SectionKey, section: MemoSection) {
  const session = await requireUser()
  await memos.updateMemoSection({ user: session }, memoId, sectionKey, section)
  revalidatePath('/legacy/datasets/ds_acred/memo')
}

export async function actionRecordFlagDecision(memoId: string, decision: FlagDecision) {
  const session = await requireUser()
  await memos.recordFlagDecision({ user: session }, memoId, decision)
  revalidatePath('/legacy/datasets/ds_acred/memo')
}

export async function actionSubmitMemo(memoId: string) {
  const session = await requireUser()
  await memos.submitMemo({ user: session }, memoId)
  revalidatePath('/legacy/datasets/ds_acred/memo')
}

export async function actionApproveMemo(memoId: string) {
  const session = await requireUser()
  await memos.approveMemo({ user: session }, memoId)
  revalidatePath('/legacy/datasets/ds_acred/memo')
}

export async function actionRequestMemoChanges(memoId: string, note: string) {
  const session = await requireUser()
  await memos.requestMemoChanges({ user: session }, memoId, note)
  revalidatePath('/legacy/datasets/ds_acred/memo')
}
