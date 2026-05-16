'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

type Props = { onExport: () => Promise<string> }

export function ExportButton({ onExport }: Props) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      const bundle = await onExport()
      const blob = new Blob([bundle], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hyve-audit-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Audit bundle downloaded')
    })
  }
  return (
    <Button onClick={run} disabled={pending} variant="outline">
      <Download className="size-3.5" /> {pending ? 'Exporting…' : 'Export bundle'}
    </Button>
  )
}
