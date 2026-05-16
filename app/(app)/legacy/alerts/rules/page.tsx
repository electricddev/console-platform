import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listAlertRules } from '@/lib/api/endpoints/alerts'
import { AlertRuleList } from '@/components/features/alerts/alert-rule-list'
import { Button } from '@/components/ui/button'

export default async function AlertRulesPage() {
  const session = await requireUser()
  const rules = await listAlertRules({ user: session })
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button asChild><Link href="/legacy/alerts/rules/new">Create rule</Link></Button>
      </div>
      <AlertRuleList rules={rules} />
    </div>
  )
}
