'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConnectedTab } from './connected/connected-tab'
import { CatalogueTab } from './catalogue/catalogue-tab'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
}

type TabValue = 'connected' | 'catalogue'

export function SourcesShell({ connections, datasets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const urlTab: TabValue = searchParams.get('tab') === 'catalogue' ? 'catalogue' : 'connected'
  const [tab, setTab] = useState<TabValue>(urlTab)

  function changeTab(next: TabValue) {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'connected') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-7 px-6 py-8 md:px-8 md:py-10">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-normal leading-tight tracking-tight text-v2-foreground">
            Sources
          </h1>
          <p className="text-[13.5px] text-v2-muted max-w-prose">
            {connections.length} sources feeding {datasets.length} datasets.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)]"
          onClick={() => { /* opens modal — wired in Task 18 */ }}
        >
          + Connect a source
        </button>
      </header>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList aria-label="Sources views">
          <TabsTrigger value="connected">Connected · {connections.length}</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>
        <TabsContent value="connected" className="mt-5">
          <ConnectedTab connections={connections} datasets={datasets} />
        </TabsContent>
        <TabsContent value="catalogue" className="mt-5">
          <CatalogueTab connections={connections} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
