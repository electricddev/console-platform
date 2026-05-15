'use client'

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '@/lib/utils'
import { Aura } from './aura'
import { Surface } from './surface'

/**
 * AuraCard — the canonical "card with palette aura" used across v2.
 *
 * Two variants, intentionally limited:
 *   hero   → top-level prominent cards (Data Vaults landing).
 *   muted  → sub-page cards. Same color family, dialed-down intensity.
 *
 * Pass `family` for the hmm-style multi-blob composition (preferred — keeps
 * the entire vault context in one color family). Pass `accent` as a
 * one-color shortcut when you want a single bottom-center wash.
 */
export type AuraCardVariant = 'hero' | 'muted'

type Radius = 'md' | 'lg' | 'xl' | '2xl'

interface AuraCardOwnProps {
  variant?: AuraCardVariant
  /** Composition colors — typically a palette family. Wins over `accent`. */
  family?: string[]
  /** Single-color shortcut. Equivalent to `family={[accent]}`. */
  accent?: string
  /** Deterministic variation index — picks one color from the family and
   *  one bottom-anchored position. Pass the card's index on a list so
   *  neighboring cards don't look identical. */
  seed?: number
  interactive?: boolean
  radius?: Radius
  className?: string
  children?: ReactNode
}

const RADIUS_DEFAULT: Record<AuraCardVariant, Radius> = {
  hero: '2xl',
  muted: 'xl',
}

type AuraCardProps<E extends ElementType> = AuraCardOwnProps & {
  as?: E
} & Omit<ComponentPropsWithoutRef<E>, keyof AuraCardOwnProps | 'as'>

function AuraCardImpl<E extends ElementType = 'div'>(
  {
    variant = 'hero',
    family,
    accent,
    seed,
    interactive,
    radius,
    className,
    children,
    as,
    ...rest
  }: AuraCardProps<E>,
  ref: Ref<Element>,
) {
  const colors = family ?? (accent ? [accent] : [])
  const resolvedRadius = radius ?? RADIUS_DEFAULT[variant]

  const SurfaceAny = Surface as React.ComponentType<Record<string, unknown>>
  return (
    <SurfaceAny
      ref={ref}
      as={as}
      interactive={interactive}
      radius={resolvedRadius}
      className={cn(className)}
      {...rest}
    >
      {colors.length > 0 && <Aura colors={colors} variant={variant} seed={seed} />}
      {children}
    </SurfaceAny>
  )
}

export const AuraCard = forwardRef(AuraCardImpl) as <E extends ElementType = 'div'>(
  props: AuraCardProps<E> & { ref?: Ref<Element> },
) => ReturnType<typeof AuraCardImpl>
