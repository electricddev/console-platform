'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSso } from '@/app/(app)/settings/security/actions'

type Provider = 'none' | 'okta' | 'azure-ad' | 'google'

export function SsoConfigForm({ initial }: { initial: Provider }) {
  const [provider, setProvider] = useState<Provider>(initial)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">SSO</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="okta">Okta</SelectItem>
            <SelectItem value="azure-ad">Azure AD</SelectItem>
            <SelectItem value="google">Google Workspace</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="justify-self-end"
          onClick={async () => {
            await updateSso(provider)
            toast.success('SSO updated')
          }}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
