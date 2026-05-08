import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/page-header'
import { createNotebookAction } from '@/app/(app)/notebooks/[notebookId]/actions'

export default function NewNotebook() {
  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <PageHeader eyebrow="// new" title="New notebook" />
      <form action={createNotebookAction} className="mt-6 grid gap-3">
        <div className="grid gap-1.5"><Label htmlFor="t">Title</Label><Input id="t" name="title" required /></div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  )
}
