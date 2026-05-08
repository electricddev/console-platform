import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-tag text-foreground/60">{'// 404'}</p>
      <h1 className="font-display text-5xl">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The route you tried doesn&apos;t exist. If you followed a link, the resource may have been
        renamed, archived, or restricted to a workspace you&apos;re not a member of.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/datasets">Browse datasets</Link>
        </Button>
      </div>
    </main>
  )
}
