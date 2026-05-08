import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Task = { id: string; title: string; href: string; kind: string }

export function PendingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <section aria-labelledby="pending-queue" className="flex h-full flex-col">
      <header className="flex items-baseline justify-between border-b border-border pb-3">
        <h3 id="pending-queue" className="font-display text-xl tracking-tight">
          Awaiting you
        </h3>
        <span className="font-tag text-foreground/55">
          {tasks.length === 0 ? 'inbox zero' : `${tasks.length.toString().padStart(2, '0')} open`}
        </span>
      </header>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 py-10">
          <p className="font-display text-lg italic text-foreground/80">You&apos;re caught up.</p>
          <p className="text-xs text-muted-foreground">
            Nothing in the queue — new approvals appear here as soon as originators submit.
          </p>
        </div>
      ) : (
        <ol className="grid">
          {tasks.map((t, i) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className={cn(
                  'group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-border/70 py-4 transition-colors hover:bg-muted/30',
                )}
              >
                <span className="font-mono text-xs tabular-nums text-foreground/45 group-hover:text-foreground/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="grid min-w-0 gap-1">
                  <p className="truncate text-[0.95rem] leading-snug text-foreground">
                    {t.title}
                  </p>
                  <span className="font-tag text-foreground/45">{`// ${t.kind}`}</span>
                </div>
                <ArrowUpRight className="size-4 text-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
