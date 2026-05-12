import { requireUser } from '@/lib/auth/server'
import { listAlertChannels } from '@/lib/api/endpoints/alerts'
import { AlertChannelList } from '@/components/features/alerts/alert-channel-list'
import { AlertChannelForm } from '@/components/features/alerts/alert-channel-form'

export default async function AlertChannelsPage() {
  const session = await requireUser()
  const channels = await listAlertChannels({ user: session })
  return (
    <div className="grid gap-4">
      <AlertChannelForm />
      <AlertChannelList channels={channels} />
    </div>
  )
}
