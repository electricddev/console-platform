'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  notebookId: string
  dirty: boolean
  saving: boolean
  onSave: () => void
}

export function SaveBar({ notebookId, dirty, saving, onSave }: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm backdrop-blur">
      <div className="text-xs text-muted-foreground">
        {dirty ? 'Unsaved changes' : 'Saved'}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/notebooks/${notebookId}`}>View</Link>
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
