'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteMember } from '@/app/(app)/settings/members/actions'

const ROLES = ['admin', 'editor', 'analyst', 'viewer', 'approver'] as const

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
        </DialogHeader>
        <form
          action={async (form) => {
            await inviteMember(form)
            setOpen(false)
            router.refresh()
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="i-name">Name</Label>
            <Input id="i-name" name="name" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="i-email">Email</Label>
            <Input id="i-email" name="email" type="email" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select name="role" defaultValue="analyst">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Send invite</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
