'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Wallet, Plug, Bell, Receipt, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/settings/organization', label: 'Organization', icon: Building2 },
  { href: '/settings/members', label: 'Members & roles', icon: Users },
  { href: '/settings/wallets', label: 'Wallets', icon: Wallet },
  { href: '/settings/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/billing', label: 'Billing', icon: Receipt },
  { href: '/settings/security', label: 'Security', icon: ShieldCheck },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="grid gap-0.5 p-2" aria-label="Settings">
      {ITEMS.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + '/')
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors', active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
          >
            <it.icon className="size-3.5" />
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
