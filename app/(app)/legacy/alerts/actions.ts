'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import * as alerts from '@/lib/api/endpoints/alerts'
import type { AlertRule, AlertChannel } from '@/lib/api/schemas'

export async function actionCreateAlertRule(payload: Omit<AlertRule, 'id' | 'createdBy' | 'createdAt'>) {
  const session = await requireUser()
  await alerts.createAlertRule({ user: session }, payload)
  revalidatePath('/legacy/alerts/rules')
}

export async function actionUpdateAlertRule(ruleId: string, patch: Partial<AlertRule>) {
  const session = await requireUser()
  await alerts.updateAlertRule({ user: session }, ruleId, patch)
  revalidatePath('/legacy/alerts/rules')
}

export async function actionDeleteAlertRule(ruleId: string) {
  const session = await requireUser()
  await alerts.deleteAlertRule({ user: session }, ruleId)
  revalidatePath('/legacy/alerts/rules')
}

export async function actionTestAlertRule(ruleId: string) {
  const session = await requireUser()
  await alerts.testAlertRule({ user: session }, ruleId)
  revalidatePath('/legacy/alerts')
}

export async function actionCreateAlertChannel(payload: Omit<AlertChannel, 'id' | 'createdBy' | 'createdAt'>) {
  const session = await requireUser()
  await alerts.createAlertChannel({ user: session }, payload)
  revalidatePath('/legacy/alerts/channels')
}

export async function actionDeleteAlertChannel(channelId: string) {
  const session = await requireUser()
  await alerts.deleteAlertChannel({ user: session }, channelId)
  revalidatePath('/legacy/alerts/channels')
}

export async function actionSendTestEvent(channelId: string): Promise<{ delivered: true } | { delivered: false; reason: string }> {
  const session = await requireUser()
  return alerts.sendTestEvent({ user: session }, channelId)
}
