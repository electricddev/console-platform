'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Code2,
  Database,
  History,
  KeyRound,
  LayoutDashboard,
  Plug,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<LucideProps>
  exact?: true
}

interface Props {
  vault: Vault
  pathname: string
  collapsed: boolean
}

export function VaultSidebarNav({ vault, pathname, collapsed }: Props) {
  const base = `/vaults/${vault.id}`

  const items: NavItem[] = [
    { href: base, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: `${base}/sources`, label: 'Sources', icon: Plug },
    { href: `${base}/data`, label: 'Data', icon: Database },
    { href: `${base}/access`, label: 'Access', icon: KeyRound },
    { href: `${base}/queries`, label: 'Queries', icon: Code2 },
    { href: `${base}/activity`, label: 'Activity', icon: History },
    { href: `${base}/settings`, label: 'Settings', icon: SlidersHorizontal },
  ]

  return (
    <>
      <div className={cn('flex-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3', 'py-4')}>
        {/* Back to all vaults */}
        <Link
          href="/vaults"
          aria-label={collapsed ? 'All data vaults' : undefined}
          className={cn(
            'group flex items-center rounded-md text-[12px] font-medium text-v2-muted transition-all duration-150',
            'hover:bg-v2-foreground/[0.05] hover:text-v2-foreground',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground',
            collapsed ? 'h-10 w-10 justify-center px-0' : 'gap-2 px-2.5 py-2'
          )}
        >
          <ArrowLeft
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {!collapsed && <span className="tracking-tight">All data vaults</span>}
        </Link>

        {/* Vault label card */}
        <VaultLabel vault={vault} collapsed={collapsed} />

        {/* Nav items */}
        <div className={cn('mt-2 space-y-[2px]', collapsed && 'flex flex-col items-center')}>
          {items.map((item) => (
            <SideNavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              layoutId="v2-vault-active"
            />
          ))}
        </div>
      </div>
    </>
  )
}

function VaultLabel({ vault, collapsed }: { vault: Vault; collapsed: boolean }) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? '#888'

  if (collapsed) {
    return (
      <div
        className="relative mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-md border border-v2-border/60 bg-v2-surface"
        title={`${vault.symbol} · ${vault.sponsor}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -right-4 h-10 w-10 rounded-full opacity-90 blur-2xl"
          style={{
            background: `radial-gradient(circle, ${hex}88 0%, transparent 70%)`,
          }}
        />
        <span className="relative text-[10.5px] font-semibold tracking-tight text-v2-foreground">
          {vault.symbol.slice(0, 3)}
        </span>
      </div>
    )
  }

  return (
    <div className="relative mt-3 overflow-hidden rounded-lg border border-v2-border/60 bg-v2-surface px-3 py-2.5 shadow-sm shadow-black/[0.02] dark:shadow-black/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-8 h-32 w-32 rounded-full opacity-90 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${hex}55 0%, ${hex}22 35%, transparent 70%)`,
        }}
      />
      <div className="relative flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: hex }}
        />
        <p className="truncate text-[13.5px] font-semibold tracking-tight text-v2-foreground">
          {vault.symbol}
        </p>
      </div>
      <p className="relative mt-1 truncate text-[11px] text-v2-muted">
        {vault.sponsor}
      </p>
    </div>
  )
}

function SideNavLink({
  item,
  pathname,
  collapsed,
  layoutId,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  layoutId: string
}) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center rounded-md text-[13.5px] tracking-tight transition-all duration-150',
        collapsed ? 'h-10 w-10 justify-center px-0' : 'gap-3 px-2.5 py-2.5',
        isActive
          ? 'font-medium text-v2-foreground'
          : 'text-v2-muted hover:text-v2-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
      )}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className={cn(
            'absolute inset-0 rounded-md bg-v2-foreground/[0.08]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          )}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-md bg-v2-foreground/[0.045] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
      <Icon
        className={cn(
          'relative h-[15px] w-[15px] shrink-0 transition-[color,transform] duration-150',
          isActive
            ? 'text-v2-foreground'
            : 'text-v2-muted group-hover:translate-x-px group-hover:text-v2-foreground'
        )}
        aria-hidden="true"
        strokeWidth={1.75}
      />
      {!collapsed && <span className="relative whitespace-nowrap">{item.label}</span>}
    </Link>
  )
}
