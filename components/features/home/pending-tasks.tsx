import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Task = { id: string; title: string; href: string; kind: string }

export function PendingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pending tasks</CardTitle>
      </CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing pending — you&apos;re caught up.
          </p>
        ) : (
          tasks.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/40"
            >
              <span className="truncate">{t.title}</span>
              <span className="font-tag text-[0.65rem] text-muted-foreground">{t.kind}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
