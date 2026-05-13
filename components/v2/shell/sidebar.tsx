'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Compass,
  Plug,
  Database,
  Layers,
  Scale,
  Users,
  Building2,
  ScrollText,
  SlidersHorizontal,
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
    items: [{ href: '/v2', label: 'Overview', icon: Compass, exact: true }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/v2/sources', label: 'Sources', icon: Plug },
      { href: '/v2/datasets', label: 'Datasets', icon: Database },
      { href: '/v2/schemas', label: 'Schemas', icon: Layers },
    ],
  },
  {
    label: 'Policy',
    items: [
      { href: '/v2/rules', label: 'Rules', icon: Scale },
      { href: '/v2/consumers', label: 'Consumers', icon: Users },
    ],
  },
  {
    label: 'Network',
    items: [
      { href: '/v2/counterparties', label: 'Counterparties', icon: Building2 },
      { href: '/v2/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
]

const settingsItem: NavItem = {
  href: '/v2/settings',
  label: 'Settings',
  icon: SlidersHorizontal,
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Widths come from --v2-sidebar-w / --v2-sidebar-w-collapsed in v2.css.
const EXPANDED_W = 224
const COLLAPSED_W = 64

export function V2Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

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

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Site navigation">
        <div>
          {navGroups.map((group, groupIdx) => {
            const isFirstGroup = groupIdx === 0
            return (
              <div
                key={group.label || 'overview'}
                className={cn(!isFirstGroup && (collapsed ? 'mt-2' : 'mt-6'))}
              >
                {/* Group eyebrow — generous tracking, low contrast, hidden when collapsed */}
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
                {/* Collapsed group separator — three dots echo the canvas grid */}
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
        </div>
      </nav>

      <div className="flex-shrink-0" />

      {/* Settings — anchored bottom */}
      <div className="border-t border-v2-border px-3 pt-3">
        <NavLink item={settingsItem} pathname={pathname} collapsed={collapsed} />
      </div>

      {/* Theme toggle — visually demoted utility */}
      <div className="px-3 pb-3 pt-1">
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

