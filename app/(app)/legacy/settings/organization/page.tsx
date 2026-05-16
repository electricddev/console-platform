import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { OrgForm } from '@/components/features/settings/org-form'

export default async function OrganizationPage() {
  const session = await requireUser()
  const org = await settings.getOrg({ user: session })
  return (
    <OrgForm
      initial={org}
      onSave={async (v) => {
        'use server'
        await settings.updateOrg({ user: session }, v)
      }}
    />
  )
}
