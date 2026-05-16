import { requireUser } from '@/lib/auth/server'
import { getCopilotThread, listCopilotThreads } from '@/lib/api/endpoints/copilot'
import { CopilotShell } from './copilot-shell'

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [thread, threads] = await Promise.all([
    getCopilotThread(ctx, threadId),
    listCopilotThreads(ctx),
  ])
  return <CopilotShell initialThread={thread} threads={threads} />
}
