'use client'

import { useMemo, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConnectedTab } from './connected/connected-tab'
import { CatalogueTab } from './catalogue/catalogue-tab'
import { AddSourceModal } from './add-source-modal/add-source-modal'
import { ManageDrawer } from './manage-drawer/manage-drawer'
import { useAddSourceModal } from './hooks/use-add-source-modal'
import { useManageDrawer } from './hooks/use-manage-drawer'
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
  const modal = useAddSourceModal()
  const drawer = useManageDrawer()

  const selectedConn = useMemo(
    () => connections.find((c) => c.id === drawer.connectionId) ?? null,
    [connections, drawer.connectionId],
  )
  const datasetsForSelected = useMemo(
    () => datasets.filter((d) => d.connectionId === drawer.connectionId),
    [datasets, drawer.connectionId],
  )

  const tab: TabValue =
    searchParams.get('tab') === 'catalogue' ? 'catalogue' : 'connected'

  function changeTab(next: TabValue) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'connected') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-10 md:px-10 md:py-12">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-normal leading-tight tracking-tight text-v2-foreground">
            Sources
          </h1>
          <p className="text-[13.5px] text-v2-muted max-w-prose">
            {connections.length} sources feeding {datasets.length} datasets.
          </p>
        </div>
        <Button
          className="bg-v2-green text-white hover:bg-v2-green-hover"
          onClick={() => { drawer.close(); modal.openPicker() }}
        >
          + Connect a source
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList variant="line" className="w-full justify-start gap-6 border-b border-v2-border/60 px-0">
          <TabsTrigger value="connected" className="flex-none gap-1.5 px-0 text-[14px]">
            Connected
            <Badge variant="secondary" className="font-mono">{connections.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="catalogue" className="flex-none px-0 text-[14px]">
            Catalogue
          </TabsTrigger>
        </TabsList>
        <TabsContent value="connected" className="mt-5">
          <ConnectedTab
            connections={connections}
            datasets={datasets}
            onRowClick={(idOrSentinel) => {
              if (idOrSentinel === '__browse') {
                changeTab('catalogue')
                return
              }
              if (idOrSentinel.startsWith('__add:')) {
                modal.openWithConnector(idOrSentinel.replace('__add:', ''))
                return
              }
              // Real connection row — mutual exclusivity with modal
              modal.close()
              drawer.open(idOrSentinel)
            }}
          />
        </TabsContent>
        <TabsContent value="catalogue" className="mt-5">
          <CatalogueTab
            connections={connections}
            onPick={(id) => {
              if (id.startsWith('__soon:')) {
                const name = id.replace('__soon:', '')
                toast(`${name} is coming soon. Email hello@hyve.xyz to vote.`)
                return
              }
              modal.openWithConnector(id)
            }}
            onAlreadyConnected={() => {
              changeTab('connected')
            }}
          />
        </TabsContent>
      </Tabs>

      <AddSourceModal modal={modal} onConnected={() => { /* connection created — refresh handled by revalidatePath */ }} />

      <ManageDrawer
        connection={selectedConn}
        datasets={datasetsForSelected}
        onClose={drawer.close}
        onReconnect={(connectorId) => { drawer.close(); modal.openWithConnector(connectorId) }}
      />
    </div>
  )
}
