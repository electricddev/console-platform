'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type Values = { name: string; description: string; websiteUrl?: string }

export function OrgForm({
  initial,
  onSave,
}: {
  initial: Values
  onSave: (v: Values) => Promise<void>
}) {
  const { register, handleSubmit } = useForm<Values>({ defaultValues: initial })
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={handleSubmit((v) =>
        start(async () => {
          await onSave(v)
          toast.success('Saved')
        })
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" {...register('description')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="url">Website</Label>
            <Input id="url" type="url" {...register('websiteUrl')} />
          </div>
          <Button type="submit" disabled={pending} className="justify-self-end">
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
