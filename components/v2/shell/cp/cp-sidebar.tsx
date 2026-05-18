'use client'

// TODO: extract ThemeToggle and NavLink into shell/primitives.tsx when a 3rd
// shell appears. Right now the 30-line duplication is cheaper than a premature
// shared module.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { UserMenu } from '../user-menu'
import {
  Compass,
  FileCode2,
  Activity,
  Vault,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { HyveLogo, HyveMark } from '@/components/v2/brand'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<LucideProps>
  exact?: true
}

const navItems: NavItem[] = [
  { href: '/cp', label: 'Home', icon: Compass, exact: true },
  { href: '/cp/analyses', label: 'Analyses', icon: FileCode2 },
  { href: '/cp/executions', label: 'Executions', icon: Activity },
  { href: '/cp/vaults', label: 'Vaults', icon: Vault },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Widths mirror --v2-sidebar-w / --v2-sidebar-w-collapsed from v2.css.
const EXPANDED_W = 224
const COLLAPSED_W = 64

export function CpSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="relative z-20 flex h-screen flex-col border-r border-v2-border bg-v2-surface transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      aria-label="Primary navigation"
    >
      {/* Brand well */}
      <div
        className={cn(
          'flex shrink-0 border-b border-v2-border',
          collapsed
            ? 'h-[88px] flex-col items-center justify-center gap-2 px-2'
            : 'h-14 items-center justify-between px-4'
        )}
      >
        {collapsed ? (
          <HyveMark size={22} className="text-v2-foreground" title="Verant" />
        ) : (
          <HyveLogo markSize={22} className="text-v2-foreground" />
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-v2-muted/80 transition-colors',
            'hover:bg-v2-foreground/[0.05] hover:text-v2-foreground',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-4',
          collapsed ? 'px-2' : 'px-3'
        )}
        aria-label="Site navigation"
      >
        <div className="space-y-[2px]">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* User menu + theme toggle pinned at the bottom */}
      <div
        className={cn(
          'border-t border-v2-border pt-3',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        <UserMenu collapsed={collapsed} settingsHref="/cp/settings" role="counterparty" />
      </div>
      <div className={cn('pb-3 pt-1', collapsed ? 'px-2' : 'px-3')}>
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  )
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
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
          layoutId="cp-sidebar-active"
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

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  const { setTheme, resolvedTheme } = useTheme()
  if (!mounted) return <div className="h-9" />
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-md py-1.5 text-[11.5px] tracking-tight text-v2-muted/70 transition-all duration-150',
        'hover:bg-v2-foreground/[0.045] hover:text-v2-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground',
        collapsed ? 'h-10 w-10 justify-center px-0' : 'px-2.5'
      )}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun
          className="h-[14px] w-[14px] shrink-0 transition-all duration-150 group-hover:translate-x-px group-hover:text-v2-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-[14px] w-[14px] shrink-0 transition-all duration-150 group-hover:translate-x-px group-hover:text-v2-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
      {!collapsed && (
        <span className="whitespace-nowrap uppercase tracking-[0.1em]">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}
