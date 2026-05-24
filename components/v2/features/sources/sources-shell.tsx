'use client'

import { useMemo, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
        <button
          type="button"
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.10_160)] hover:shadow-[0_4px_18px_-8px_oklch(0.40_0.10_160_/_0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)] transition-colors duration-150"
          onClick={() => { drawer.close(); modal.openPicker() }}
        >
          + Connect a source
        </button>
      </header>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList className="h-auto justify-start gap-6 rounded-none border-b border-v2-border/60 bg-transparent p-0">
          <TabsTrigger
            value="connected"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-[13.5px] font-medium text-v2-muted shadow-none data-[state=active]:border-v2-foreground data-[state=active]:bg-transparent data-[state=active]:text-v2-foreground data-[state=active]:shadow-none transition-colors duration-150"
          >
            {'Connected · '}
            <span aria-hidden="true" className="font-mono text-[11px] text-v2-muted/70">{connections.length}</span>
            <span className="sr-only">{connections.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="catalogue"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-[13.5px] font-medium text-v2-muted shadow-none data-[state=active]:border-v2-foreground data-[state=active]:bg-transparent data-[state=active]:text-v2-foreground data-[state=active]:shadow-none transition-colors duration-150"
          >
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
