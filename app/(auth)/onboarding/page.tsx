import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { fixtures } from '@/lib/api/fixtures'
import { completeOnboarding } from './actions'

export const metadata = { title: 'Welcome · Hyve' }

export default async function OnboardingPage() {
  const session = await requireUser()
  const me = await getCurrentUser({ user: session })
  const org = fixtures.orgs.find((o) => o.id === me.orgId)!

  return (
    <Card>
      <CardHeader>
        <p className="font-tag text-foreground/70 mb-2">{'// onboarding'}</p>
        <h1 className="font-display text-3xl">Welcome to Hyve</h1>
        <CardDescription>
          You&apos;re signed in as <strong>{me.name}</strong> at <strong>{org.name}</strong> (
          <span className="font-mono text-xs">{me.role}</span>). Confirm a few preferences to land
          in the right surface. You can change all of these later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={completeOnboarding} className="grid gap-6">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Workspace density</legend>
            <RadioGroup name="density" defaultValue="compact" className="grid gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem id="d-compact" value="compact" />
                <Label htmlFor="d-compact">
                  <span className="font-medium">Compact</span> — denser tables, more on screen.
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="d-comfortable" value="comfortable" />
                <Label htmlFor="d-comfortable">
                  <span className="font-medium">Comfortable</span> — roomier rows.
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Invite teammates (optional)</legend>
            <Input type="email" name="invite" placeholder="teammate@your-org.xyz" />
            <p className="text-xs text-muted-foreground">
              Stub — invites land in Settings → Members later.
            </p>
          </fieldset>

          <Button type="submit" size="lg">Enter workspace</Button>
        </form>
      </CardContent>
    </Card>
  )
}
