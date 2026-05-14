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
 * Three variants, intentionally limited:
 *   hero   → top-level prominent cards (Data Vaults grid). Big single aura.
 *   muted  → sub-page cards (vault overview tiles, list containers).
 *            Smaller, softer aura — same visual language, dialed down.
 *   multi  → multi-color aura (project-style spread). Use when a card
 *            represents several entities at once (e.g. a vault with N
 *            counterparties tinting it).
 *
 * Built from <Surface> + <Aura>. If you find yourself wanting a fourth
 * variant, push back — talk to design first.
 */
export type AuraCardVariant = 'hero' | 'muted' | 'multi'

type AuraPosition = 'tl' | 'tr' | 'bl' | 'br'
type Radius = 'md' | 'lg' | 'xl' | '2xl'

interface VariantDefaults {
  tone: 'soft' | 'normal' | 'strong'
  size: string
  position: AuraPosition
  radius: Radius
}

const VARIANT_DEFAULTS: Record<Exclude<AuraCardVariant, 'multi'>, VariantDefaults> = {
  hero: { tone: 'normal', size: 'h-64 w-64', position: 'br', radius: '2xl' },
  muted: { tone: 'normal', size: 'h-44 w-44', position: 'br', radius: 'xl' },
}

interface AuraCardOwnProps {
  variant?: AuraCardVariant
  /** Hex color for hero/muted variants. */
  accent?: string
  /** Optional second hex for a two-tone wash (matches hmm's AgentBlob). */
  accentEnd?: string
  /** Colors array for multi variant. */
  accents?: string[]
  /** Override the aura corner. */
  position?: AuraPosition
  /** Make the card interactive (hover lift + shadow + cursor pointer). */
  interactive?: boolean
  /** Override the rounded radius. */
  radius?: Radius
  className?: string
  children?: ReactNode
}

type AuraCardProps<E extends ElementType> = AuraCardOwnProps & {
  as?: E
} & Omit<ComponentPropsWithoutRef<E>, keyof AuraCardOwnProps | 'as'>

function AuraCardImpl<E extends ElementType = 'div'>(
  {
    variant = 'hero',
    accent,
    accentEnd,
    accents,
    position,
    interactive,
    radius,
    className,
    children,
    as,
    ...rest
  }: AuraCardProps<E>,
  ref: Ref<Element>,
) {
  let aura: ReactNode = null
  let resolvedRadius: Radius

  if (variant === 'multi') {
    resolvedRadius = radius ?? '2xl'
    if (accents && accents.length > 0) {
      aura = <Aura colors={accents} />
    } else if (accent) {
      aura = (
        <Aura
          color={accent}
          colorEnd={accentEnd}
          position={position ?? 'br'}
          tone="normal"
        />
      )
    }
  } else {
    const v = VARIANT_DEFAULTS[variant]
    resolvedRadius = radius ?? v.radius
    if (accent) {
      aura = (
        <Aura
          color={accent}
          colorEnd={accentEnd}
          position={position ?? v.position}
          tone={v.tone}
          size={v.size}
        />
      )
    }
  }

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
      {aura}
      {children}
    </SurfaceAny>
  )
}

export const AuraCard = forwardRef(AuraCardImpl) as <E extends ElementType = 'div'>(
  props: AuraCardProps<E> & { ref?: Ref<Element> },
) => ReturnType<typeof AuraCardImpl>
