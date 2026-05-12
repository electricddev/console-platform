'use client'

import Link from 'next/link'
import {
  Activity,
  BellRing,
  Bot,
  Building2,
  ClipboardSignature,
  Database,
  FileSpreadsheet,
  KeyRound,
  Layers,
  LayoutDashboard,
  PanelLeft,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { usePersistentState } from '@/lib/hooks/use-persistent-state'
import { SidebarNavItem } from './sidebar-nav-item'
import type { Role } from '@/lib/api/types'

type Props = { role: Role }

const COUNTERPARTY_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/issuers', label: 'Issuers', icon: Building2 },
  { href: '/alerts', label: 'Alerts', icon: BellRing },
  { href: '/templates', label: 'Templates', icon: FileSpreadsheet },
  { href: '/runs', label: 'Runs', icon: Activity },
  { href: '/copilot', label: 'Copilot', icon: Bot },
  { href: '/notebooks', label: 'Notebooks', icon: ScrollText },
] as const

const ORIGINATOR_ITEMS = [
  { href: '/sources', label: 'Sources', icon: Plug },
  { href: '/schemas', label: 'Schemas', icon: Layers },
  { href: '/approvals', label: 'Approvals', icon: ClipboardSignature },
  { href: '/access', label: 'Access', icon: KeyRound },
] as const

const SHARED_BOTTOM_ITEMS = [
  { href: '/audit', label: 'Audit log', icon: ShieldCheck },
] as const

export function Sidebar({ role }: Props) {
  const [collapsed, setCollapsed] = usePersistentState('sidebar.collapsed', false)
  const showOriginator = role === 'originator' || role === 'admin'
  const showCounterparty = role === 'counterparty' || role === 'admin'

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
      aria-label="Primary navigation"
    >
      <div className="flex h-[var(--topbar-height)] items-center justify-between px-2">
        <Link href="/" className={cn('flex items-center gap-2 px-2', collapsed && 'justify-center px-0')}>
          <Hex />
          {!collapsed && (
            <span className="font-tag text-[0.85rem] tracking-[0.18em]">hyve</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2">
        <nav className="flex flex-col gap-0.5 py-2">
          {showCounterparty && COUNTERPARTY_ITEMS.map((it) => (
            <SidebarNavItem key={it.href} {...it} collapsed={collapsed} />
          ))}
          {showOriginator && (
            <>
              <Separator className="my-2" />
              {ORIGINATOR_ITEMS.map((it) => (
                <SidebarNavItem key={it.href} {...it} collapsed={collapsed} />
              ))}
            </>
          )}
          <Separator className="my-2" />
          {SHARED_BOTTOM_ITEMS.map((it) => (
            <SidebarNavItem key={it.href} {...it} collapsed={collapsed} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        <SidebarNavItem href="/settings/organization" label="Settings" icon={Settings} collapsed={collapsed} />
      </nav>
    </aside>
  )
}

function Hex() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 8.5 16 11v3l-4 2.5L8 14v-3l4-2.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
