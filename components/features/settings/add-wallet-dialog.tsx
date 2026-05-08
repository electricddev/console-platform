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
import { addWallet } from '@/app/(app)/settings/wallets/actions'

export function AddWalletDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add wallet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a signing wallet</DialogTitle>
        </DialogHeader>
        <form
          action={async (form) => {
            await addWallet(form)
            setOpen(false)
            router.refresh()
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="w-label">Label</Label>
            <Input id="w-label" name="label" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="w-addr">Address (0x…)</Label>
            <Input
              id="w-addr"
              name="address"
              required
              pattern="^0x[a-fA-F0-9]{40}$"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Kind</Label>
            <Select name="kind" defaultValue="hot">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">hot</SelectItem>
                <SelectItem value="hardware">hardware</SelectItem>
                <SelectItem value="multisig">multisig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Add wallet</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
