'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as decisions from '@/lib/api/endpoints/decisions'
import type { NotificationChannelKind } from '@/lib/api/schemas'

export async function actionAcknowledgeFlag(payload: { flagId: string; datasetId: string; note: string }) {
  const session = await requireUser()
  await decisions.acknowledgeFlag({ user: session }, payload)
  revalidatePath(`/legacy/datasets/${payload.datasetId}`)
}

export async function actionSnoozeFlag(payload: { flagId: string; datasetId: string }) {
  const session = await requireUser()
  await decisions.snoozeFlag({ user: session }, payload)
  revalidatePath(`/legacy/datasets/${payload.datasetId}`)
}

export async function actionSetThreshold(payload: { ruleId: string; datasetId: string; metric: string; value: number; direction: 'above' | 'below' }) {
  const session = await requireUser()
  await decisions.setThreshold({ user: session }, payload)
  revalidatePath(`/legacy/datasets/${payload.datasetId}`)
}

export async function actionDismissAnomaly(payload: { anomalyId: string; reason: string; datasetId: string }) {
  const session = await requireUser()
  await decisions.dismissAnomaly({ user: session }, payload)
  revalidatePath(`/legacy/datasets/${payload.datasetId}`)
  revalidatePath('/legacy/alerts')
}

export async function actionSetWatch(payload: { datasetId: string; channels: NotificationChannelKind[] }) {
  const session = await requireUser()
  await decisions.setWatch({ user: session }, payload)
  revalidatePath(`/legacy/datasets/${payload.datasetId}`)
}

export async function actionClearWatch(datasetId: string) {
  const session = await requireUser()
  await decisions.clearWatch({ user: session }, datasetId)
  revalidatePath(`/legacy/datasets/${datasetId}`)
}
