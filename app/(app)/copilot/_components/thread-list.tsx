import Link from 'next/link'
import { fmtRelativeTime } from '@/lib/format'
import type { CopilotThread } from '@/lib/api/types'

export function ThreadList({ threads, currentId }: { threads: CopilotThread[]; currentId?: string }) {
  return (
    <nav className="grid gap-0.5 p-2">
      {threads.map((t) => (
        <Link
          key={t.id}
          href={`/copilot/${t.id}`}
          aria-current={t.id === currentId ? 'page' : undefined}
          className="grid gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 aria-[current=page]:bg-muted"
        >
          <span className="truncate font-medium">{t.title}</span>
          <span className="font-tag text-[0.65rem] text-muted-foreground">{fmtRelativeTime(t.updatedAt)}</span>
        </Link>
      ))}
    </nav>
  )
}
