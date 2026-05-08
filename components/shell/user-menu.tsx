'use client'

import Link from 'next/link'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { User } from '@/lib/api/types'
import { signOut } from '@/app/(auth)/login/actions'
import { DensityToggle } from './density-toggle'
import type { Density } from '@/lib/auth/types'

type Props = { user: User; orgName: string; density: Density }

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserMenu({ user, orgName, density }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Account menu" className="rounded-full">
          <Avatar className="size-7">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="text-[0.7rem]">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <span className="text-[0.65rem] text-muted-foreground">{orgName} · {user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/organization">
            <Settings className="size-3.5" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/wallets">
            <UserIcon className="size-3.5" /> My identity
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <DensityToggle current={density} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-left">
              <LogOut className="size-3.5" /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
