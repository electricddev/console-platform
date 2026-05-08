'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type PaletteCtx = {
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

const Ctx = createContext<PaletteCtx | null>(null)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const router = useRouter()

  const ctx = useMemo<PaletteCtx>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
      isOpen,
    }),
    [isOpen]
  )

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Command>
            <CommandInput placeholder="Search datasets, templates, runs… or run a command" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>

              <CommandGroup heading="Navigate">
                <CommandItem onSelect={() => go('/')}>Home</CommandItem>
                <CommandItem onSelect={() => go('/datasets')}>Datasets</CommandItem>
                <CommandItem onSelect={() => go('/templates')}>Templates</CommandItem>
                <CommandItem onSelect={() => go('/runs')}>Runs</CommandItem>
                <CommandItem onSelect={() => go('/copilot')}>Copilot</CommandItem>
                <CommandItem onSelect={() => go('/audit')}>Audit log</CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Originator">
                <CommandItem onSelect={() => go('/sources')}>Sources</CommandItem>
                <CommandItem onSelect={() => go('/schemas')}>Schemas</CommandItem>
                <CommandItem onSelect={() => go('/approvals')}>Approvals</CommandItem>
                <CommandItem onSelect={() => go('/access')}>Access</CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Settings">
                <CommandItem onSelect={() => go('/settings/organization')}>Organization</CommandItem>
                <CommandItem onSelect={() => go('/settings/members')}>Members &amp; roles</CommandItem>
                <CommandItem onSelect={() => go('/settings/wallets')}>Wallets</CommandItem>
                <CommandItem onSelect={() => go('/settings/integrations')}>Integrations</CommandItem>
                <CommandItem onSelect={() => go('/settings/notifications')}>Notifications</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}

export function useCommandPalette(): PaletteCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCommandPalette must be used inside CommandPaletteProvider')
  return v
}
