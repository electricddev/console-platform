import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { listAlertChannels } from '@/lib/api/endpoints/alerts'
import { AlertRuleForm } from '@/components/features/alerts/alert-rule-form'
import { actionCreateAlertRule } from '@/app/(app)/legacy/alerts/actions'

export default async function NewAlertRulePage() {
  const session = await requireUser()
  const channels = await listAlertChannels({ user: session })
  return (
    <AlertRuleForm
      channels={channels}
      onSubmit={async (payload) => { 'use server'; await actionCreateAlertRule(payload); redirect('/legacy/alerts/rules') }}
    />
  )
}
