'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultSidebarNav } from './vault-sidebar-nav'
import { UserMenu } from './user-menu'
import {
  Compass,
  Vault,
  History,
  Plug,
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

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '/', label: 'Overview', icon: Compass, exact: true },
      { href: '/vaults', label: 'Data Vaults', icon: Vault },
      { href: '/sources', label: 'Sources', icon: Plug },
      { href: '/audit', label: 'Activity', icon: History },
    ],
  },
]


interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Widths come from --v2-sidebar-w / --v2-sidebar-w-collapsed in v2.css.
const EXPANDED_W = 224
const COLLAPSED_W = 64

export function V2Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  // Detect vault detail routes — /vaults/:id and anything beneath it (but
  // NOT the index /vaults). Inside a vault we swap the entire nav block.
  const vaultId = useMemo(() => {
    const m = pathname.match(/^\/vaults\/([^/]+)/)
    return m ? m[1] : null
  }, [pathname])
  const vault = vaultId ? findVault(vaultId) : null

  return (
    <aside
      className="relative z-20 flex h-screen flex-col border-r border-v2-border bg-v2-surface transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      aria-label="Primary navigation"
    >
      {/* Brand well — static logo on the left, dedicated collapse chevron
          on the right. Collapsed mode shows the mark stacked above the
          chevron so both stay reachable. */}
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

      {/* Swap-region: root navigation OR vault-scoped navigation. The brand
          well above and the theme toggle below stay fixed; the middle and
          settings sections animate together so the surface feels coherent. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {vault ? (
            <motion.div
              key={`vault-${vault.id}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <VaultSidebarNav
                vault={vault}
                pathname={pathname}
                collapsed={collapsed}
              />
            </motion.div>
          ) : (
            <motion.div
              key="root"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <nav
                className={cn(
                  'flex-1 overflow-y-auto py-4',
                  collapsed ? 'px-2' : 'px-3'
                )}
                aria-label="Site navigation"
              >
                {navGroups.map((group, groupIdx) => {
                  const isFirstGroup = groupIdx === 0
                  return (
                    <div
                      key={group.label || 'overview'}
                      className={cn(!isFirstGroup && (collapsed ? 'mt-2' : 'mt-6'))}
                    >
                      {!isFirstGroup && (
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-200',
                            collapsed ? 'mb-0 h-0 opacity-0' : 'mb-2 h-3 opacity-100'
                          )}
                          aria-hidden="true"
                        >
                          <p className="px-2 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-v2-muted/65">
                            {group.label}
                          </p>
                        </div>
                      )}
                      {!isFirstGroup && collapsed && (
                        <div
                          className="mx-auto mb-2 mt-1 flex w-8 items-center justify-center gap-[5px]"
                          aria-hidden="true"
                        >
                          <span className="h-[3px] w-[3px] rounded-full bg-v2-foreground/25" />
                          <span className="h-[3px] w-[3px] rounded-full bg-v2-foreground/25" />
                          <span className="h-[3px] w-[3px] rounded-full bg-v2-foreground/25" />
                        </div>
                      )}
                      <div className="space-y-[2px]">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            collapsed={collapsed}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User menu + theme toggle — pinned at the bottom, persists across
          the root ↔ vault swap so the bottom section feels fixed. */}
      <div
        className={cn(
          'border-t border-v2-border pt-3',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        <UserMenu collapsed={collapsed} role="originator" />
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
        // More vertical breathing room than the prior tune; bigger gap between icon and label.
        collapsed ? 'h-10 w-10 justify-center px-0' : 'gap-3 px-2.5 py-2.5',
        isActive
          ? 'font-medium text-v2-foreground'
          : 'text-v2-muted hover:text-v2-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
      )}
    >
      {/* Active background — solid pill with a hairline inner highlight at the top edge.
          The highlight is the only subtle "premium" detail; it reads as light catching
          the pill rather than a flat fill. Foreground tint at 8%/12% per theme keeps the
          contrast on solid surface readable without a colored accent. */}
      {isActive && (
        <motion.div
          layoutId="v2-sidebar-active"
          className={cn(
            'absolute inset-0 rounded-md bg-v2-foreground/[0.08]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          )}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}

      {/* Hover background — only when not active */}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-md bg-v2-foreground/[0.045] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}

      {/* Icon — monochrome, slight color easing on hover. No brand color. */}
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

      {/* Label */}
      {!collapsed && <span className="relative whitespace-nowrap">{item.label}</span>}
    </Link>
  )
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  // next-themes resolves on the client only; without this guard the button would
  // render different markup on server vs. first client paint and trip hydration.
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
        // Demoted: smaller type, lower base opacity, no font-medium.
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

