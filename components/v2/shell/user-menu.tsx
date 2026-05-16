'use client'

import Link from 'next/link'
import { Building2, Check, ChevronsUpDown, Globe, HelpCircle, LogOut, Settings, Wrench } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Fixture data — replace with real session/org context when wired
// ---------------------------------------------------------------------------

type Workspace = { id: string; name: string; plan: string; kind: 'org' | 'personal' }

const USER = { name: 'Douwe', email: 'douwe@thehyve.xyz', initials: 'DF' }

const WORKSPACES: Workspace[] = [
  { id: 'hyve', name: 'Hyve', plan: 'Team plan · Primary owner', kind: 'org' },
  { id: 'personal', name: 'Personal', plan: 'Free plan', kind: 'personal' },
]

const ACTIVE_WORKSPACE_ID = 'hyve'

type Language = { code: string; label: string }

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
]

const ACTIVE_LANGUAGE = 'en'

// ---------------------------------------------------------------------------
// Shared v2 overrides — passed as className to every shadcn primitive consumer
// ---------------------------------------------------------------------------

/** The dropdown surface — v2-surface bg, v2-border ring, rounded-xl, soft shadow. */
const CONTENT_CLS =
  'w-[280px] rounded-xl border border-v2-border bg-v2-surface p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.20),0_2px_6px_-2px_rgba(0,0,0,0.08)] ring-0'

/**
 * Standard action-row item.
 * Overrides the primitive's `focus:bg-accent focus:text-accent-foreground` with
 * v2 tokens. Both `focus:` and `data-[highlighted]:` are wired — Radix sets
 * `data-highlighted=""` on the current keyboard/pointer-hover item, which is
 * also the element that receives :focus, so the two selectors are complementary.
 */
const ITEM_CLS =
  'group/v2-row gap-3 rounded-md px-2.5 py-2 text-[13.5px] tracking-tight text-v2-foreground cursor-pointer transition-colors duration-150 focus:bg-v2-foreground/[0.045] focus:text-v2-foreground focus:**:text-v2-foreground! data-[highlighted]:bg-v2-foreground/[0.045] data-[highlighted]:text-v2-foreground data-[highlighted]:**:text-v2-foreground!'

/** Workspace radio rows — same as ITEM_CLS but slightly taller (2-line label). */
const WORKSPACE_ROW_CLS =
  'user-menu-radio group/v2-row gap-3 rounded-md px-2.5 py-2.5 text-[13.5px] tracking-tight text-v2-foreground cursor-pointer transition-colors duration-150 focus:bg-v2-foreground/[0.045] focus:text-v2-foreground focus:**:text-v2-foreground! data-[highlighted]:bg-v2-foreground/[0.045] data-[highlighted]:text-v2-foreground data-[highlighted]:**:text-v2-foreground!'

/** Language radio rows — single-line, standard py-2. */
const LANG_ROW_CLS =
  'user-menu-radio group/v2-row gap-3 rounded-md px-2.5 py-2 text-[13.5px] tracking-tight text-v2-foreground cursor-pointer transition-colors duration-150 focus:bg-v2-foreground/[0.045] focus:text-v2-foreground focus:**:text-v2-foreground! data-[highlighted]:bg-v2-foreground/[0.045] data-[highlighted]:text-v2-foreground data-[highlighted]:**:text-v2-foreground!'

/**
 * Menu-row icon — 15px to match NavLink, muted by default.
 * `group-focus/v2-row` and `group-data-[highlighted]/v2-row` mirror the NavLink
 * pattern: icon color follows text on hover/keyboard-nav.
 */
const ICON_CLS =
  'size-[15px] shrink-0 text-v2-muted group-focus/v2-row:text-v2-foreground group-data-[highlighted]/v2-row:text-v2-foreground'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-v2-foreground/10 font-medium text-v2-foreground',
        size === 'sm' ? 'h-[26px] w-[26px] text-[11px]' : 'h-7 w-7 text-[12px]'
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

function OrgMark() {
  return (
    <span
      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-v2-foreground/10"
      aria-hidden="true"
    >
      <Building2 className="h-[13px] w-[13px] text-v2-foreground" strokeWidth={1.75} />
    </span>
  )
}

// ---------------------------------------------------------------------------
// WorkspaceRow — uses DropdownMenuRadioItem for correct radio group semantics
// The visual Check icon stays right-aligned; the Radix ItemIndicator (absolute
// right-2) is suppressed via pointer-events-none / invisible so it doesn't
// double-render. The sr-only span gives AT users a clear "Active workspace" cue.
// ---------------------------------------------------------------------------

function WorkspaceRow({ workspace, isActive }: { workspace: Workspace; isActive: boolean }) {
  return (
    // Wrapper class hides Radix's built-in indicator via globals.css; our
    // custom right-aligned Check provides the visual affordance while Radix
    // still manages aria-checked on the element.
    <DropdownMenuRadioItem
      value={workspace.id}
      className={cn(WORKSPACE_ROW_CLS, 'flex items-center pr-2')}
    >
      {workspace.kind === 'org' ? (
        <OrgMark />
      ) : (
        <Avatar initials={USER.initials} size="sm" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium leading-snug">{workspace.name}</span>
        <span className="truncate text-[11px] leading-snug text-v2-muted">{workspace.plan}</span>
      </div>
      {isActive && (
        <>
          <Check
            className="ml-auto h-[14px] w-[14px] shrink-0 text-v2-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="sr-only">Active workspace</span>
        </>
      )}
    </DropdownMenuRadioItem>
  )
}

function LanguageRow({ lang, isActive }: { lang: Language; isActive: boolean }) {
  return (
    <DropdownMenuRadioItem value={lang.code} className={cn(LANG_ROW_CLS, 'pr-2')}>
      <span className="flex-1">{lang.label}</span>
      {isActive && (
        <>
          <Check
            className="ml-auto h-[14px] w-[14px] shrink-0 text-v2-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="sr-only">Selected</span>
        </>
      )}
    </DropdownMenuRadioItem>
  )
}

// ---------------------------------------------------------------------------
// UserMenu — exported
// ---------------------------------------------------------------------------

export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const activeWorkspace = WORKSPACES.find((w) => w.id === ACTIVE_WORKSPACE_ID) ?? WORKSPACES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          // Collapsed: 40×40 icon-only button
          <button
            type="button"
            aria-label="Open user menu"
            className={cn(
              'flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors duration-150',
              'hover:bg-v2-foreground/[0.045]',
              // Open state — same active-NavLink treatment as the expanded trigger
              'data-[state=open]:bg-v2-foreground/[0.08]',
              'data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
              // Softer focus-visible: hairline outline (1px) at 30% opacity so
              // mouse-click close doesn't leave a harsh solid ring.
              'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground/30'
            )}
          >
            <Avatar initials={USER.initials} />
          </button>
        ) : (
          // Expanded: full-width pill. No aria-label — the visible text
          // "Douwe · Hyve" is the accessible name (WCAG 2.5.3 Label in Name).
          <button
            type="button"
            className={cn(
              'group relative flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] tracking-tight transition-colors duration-150',
              'text-v2-muted hover:text-v2-foreground',
              'hover:bg-v2-foreground/[0.045]',
              // Open state — the pill shows the active-NavLink background while
              // the dropdown is open, so it reads as "I am the source of this menu".
              'data-[state=open]:bg-v2-foreground/[0.08] data-[state=open]:text-v2-foreground',
              'data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
              // Softer focus-visible: hairline, 30% opacity — a11y preserved,
              // but the ring doesn't flash harshly on mouse-click close.
              'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground/30'
            )}
          >
            <Avatar initials={USER.initials} />
            <span className="flex min-w-0 flex-1 items-baseline gap-1 truncate">
              <span className="truncate font-medium text-v2-foreground">{USER.name}</span>
              <span className="text-v2-muted" aria-hidden="true">·</span>
              <span className="truncate text-v2-muted">{activeWorkspace.name}</span>
            </span>
            <ChevronsUpDown
              className="ml-auto h-[14px] w-[14px] shrink-0 text-v2-muted/60"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        )}
      </DropdownMenuTrigger>

      {/* DropdownMenuContent: v2-surface bg, v2-border, rounded-xl, soft shadow, ring-0.
          `data-v2` is required because the Radix Portal mounts to <body>, outside the
          [data-v2] tree — without it the v2-* tokens resolve to nothing (transparent). */}
      <DropdownMenuContent
        data-v2=""
        side="top"
        align="start"
        sideOffset={8}
        className={CONTENT_CLS}
      >
        {/* Email header — 11.5px muted label with breathing room */}
        <DropdownMenuLabel className="px-2.5 py-2 text-[11.5px] tracking-tight text-v2-muted">
          {USER.email}
        </DropdownMenuLabel>

        {/* Separator — bg-v2-border, bleeds through parent p-1.5 via -mx-1.5 */}
        <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-v2-border" />

        {/* Workspace switcher — RadioGroup gives role="radiogroup" on the
            container and role="menuitemradio" + aria-checked on each item. */}
        <DropdownMenuRadioGroup value={ACTIVE_WORKSPACE_ID}>
          {WORKSPACES.map((workspace) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === ACTIVE_WORKSPACE_ID}
            />
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-v2-border" />

        {/* Settings */}
        <DropdownMenuItem asChild className={ITEM_CLS}>
          <Link href="/v2/settings" className="flex items-center gap-3">
            <Settings className={ICON_CLS} strokeWidth={1.75} aria-hidden="true" />
            <span>Settings</span>
            <DropdownMenuShortcut className="text-[11px] tracking-[0.1em] text-v2-muted/80">
              ⌘,
            </DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>

        {/* Organization settings */}
        <DropdownMenuItem asChild className={ITEM_CLS}>
          <Link href="/v2/settings" className="flex items-center gap-3">
            <Wrench className={ICON_CLS} strokeWidth={1.75} aria-hidden="true" />
            <span>Organization settings</span>
          </Link>
        </DropdownMenuItem>

        {/* Language submenu — RadioGroup for semantic selected state */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(
              ITEM_CLS,
              // Override the primitive's data-open state (sub-menu open) to stay on v2 tokens
              'data-[state=open]:bg-v2-foreground/[0.045] data-[state=open]:text-v2-foreground'
            )}
          >
            <Globe className={ICON_CLS} strokeWidth={1.75} aria-hidden="true" />
            <span>Language</span>
          </DropdownMenuSubTrigger>
          {/* SubContent: same surface treatment as the parent menu.
              `data-v2` again — submenu mounts in its own portal. */}
          <DropdownMenuSubContent
            data-v2=""
            className={cn(
              CONTENT_CLS,
              // SubContent has its own min-width; allow it to be narrower than 280px
              'w-auto min-w-[160px]'
            )}
          >
            <DropdownMenuRadioGroup value={ACTIVE_LANGUAGE}>
              {LANGUAGES.map((lang) => (
                <LanguageRow key={lang.code} lang={lang} isActive={lang.code === ACTIVE_LANGUAGE} />
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Get help */}
        <DropdownMenuItem asChild className={ITEM_CLS}>
          <a
            href="https://docs.hyve.xyz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3"
          >
            <HelpCircle className={ICON_CLS} strokeWidth={1.75} aria-hidden="true" />
            <span>Get help</span>
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-v2-border" />

        {/* Log out */}
        <DropdownMenuItem asChild className={ITEM_CLS}>
          <button type="button" className="flex w-full items-center gap-3">
            <LogOut className={ICON_CLS} strokeWidth={1.75} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
