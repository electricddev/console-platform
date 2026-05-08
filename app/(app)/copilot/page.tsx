import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { listCopilotThreads, createCopilotThread } from '@/lib/api/endpoints/copilot'

export default async function CopilotRoot() {
  const session = await requireUser()
  const threads = await listCopilotThreads({ user: session })
  if (threads.length > 0) redirect(`/copilot/${threads[0].id}`)
  const t = await createCopilotThread({ user: session }, { title: 'Untitled' })
  redirect(`/copilot/${t.id}`)
}
