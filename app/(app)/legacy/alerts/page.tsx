import { requireUser } from '@/lib/auth/server'
import { listAlertEvents } from '@/lib/api/endpoints/alerts'
import { AlertFeed } from '@/components/features/alerts/alert-feed'

export default async function AlertsFeedPage() {
  const session = await requireUser()
  const events = await listAlertEvents({ user: session })
  return <AlertFeed events={events} />
}
