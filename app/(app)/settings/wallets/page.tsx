import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { AddWalletDialog } from '@/components/features/settings/add-wallet-dialog'
import { WalletsTable } from '@/components/features/settings/wallets-table'
import { setPrimary, removeWallet } from './actions'

export default async function WalletsPage() {
  const session = await requireUser()
  const wallets = await settings.listWallets({ user: session })
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="font-tag text-foreground/55">{`// ${wallets.length} wallets`}</p>
        <AddWalletDialog />
      </div>
      <WalletsTable
        wallets={wallets}
        onSetPrimary={async (id) => {
          'use server'
          await setPrimary(id)
        }}
        onRemove={async (id) => {
          'use server'
          await removeWallet(id)
        }}
      />
    </div>
  )
}
