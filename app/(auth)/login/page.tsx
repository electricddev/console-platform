import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { signInAs } from './actions'

export const metadata = { title: 'Sign in · Hyve' }

type Search = { next?: string }

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const next = sp.next

  return (
    <Card>
      <CardHeader>
        <p className="font-tag text-foreground/70 mb-2">{'// hyve data clean room'}</p>
        <h1 className="font-display text-3xl font-medium leading-snug">Sign in</h1>
        <CardDescription>
          Choose a demo persona to explore the platform. Real SSO and wallet sign-in
          land later — these stub sessions are equivalent for product walkthroughs.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <form action={async () => { 'use server'; await signInAs('counterparty', next) }}>
          <Button type="submit" size="lg" className="w-full justify-start">
            Demo Counterparty &middot; <span className="text-muted-foreground ml-2">Maya at Gauntlet</span>
          </Button>
        </form>
        <form action={async () => { 'use server'; await signInAs('originator', next) }}>
          <Button type="submit" size="lg" variant="outline" className="w-full justify-start">
            Demo Originator &middot; <span className="text-muted-foreground ml-2">Tom at Maple Trade Finance</span>
          </Button>
        </form>
        <form action={async () => { 'use server'; await signInAs('admin', next) }}>
          <Button type="submit" size="lg" variant="ghost" className="w-full justify-start">
            Demo Admin &middot; <span className="text-muted-foreground ml-2">Dual-role observer</span>
          </Button>
        </form>
        <p className="font-tag text-foreground/55 mt-4 text-center">
          {'// verifiable underwriting infrastructure for tokenized credit'}
        </p>
      </CardContent>
    </Card>
  )
}
