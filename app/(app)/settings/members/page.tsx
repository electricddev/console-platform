import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { MembersTable } from '@/components/features/settings/members-table'
import { InviteMemberDialog } from '@/components/features/settings/invite-member-dialog'
import { removeMember } from './actions'

export default async function MembersPage() {
  const session = await requireUser()
  const members = await settings.listMembers({ user: session })
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="font-tag text-foreground/55">{`// ${members.length} members`}</p>
        <InviteMemberDialog />
      </div>
      <MembersTable
        members={members}
        onRemove={async (id) => {
          'use server'
          await removeMember(id)
        }}
      />
    </div>
  )
}
