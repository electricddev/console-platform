'use server'
import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import type { ApiKey, Webhook } from '@/lib/api/types'

export async function createApiKeyAction(input: { label: string; scopes: ApiKey['scopes'] }) {
  const session = await requireUser()
  return settings.createApiKey({ user: session }, input)
}
export async function revokeApiKeyAction(id: string) {
  const session = await requireUser()
  await settings.revokeApiKey({ user: session }, id)
}
export async function createWebhookAction(input: { url: string; events: Webhook['events'] }) {
  const session = await requireUser()
  return settings.createWebhook({ user: session }, input)
}
export async function toggleWebhookAction(id: string) {
  const session = await requireUser()
  await settings.toggleWebhook({ user: session }, id)
}
