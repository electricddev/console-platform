import type { ReactNode } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { SettingsNav } from '@/components/features/settings/settings-nav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// settings" title="Settings" description="Workspace configuration." />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)] gap-6">
        <aside className="rounded-lg border border-border bg-surface/40 h-fit">
          <SettingsNav />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}
