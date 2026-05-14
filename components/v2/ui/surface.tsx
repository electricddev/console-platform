'use client'

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '@/lib/utils'

type SurfaceTone = 'solid' | 'subtle'
type SurfaceRadius = 'md' | 'lg' | 'xl' | '2xl'
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg'

interface SurfaceOwnProps {
  /**
   * 'solid'  — solid surface that lifts off the page (default — vault cards, panels)
   * 'subtle' — flatter, used for low-stakes chips and inline pills
   */
  tone?: SurfaceTone
  /** Hover lift + shadow + cursor pointer. Pair with as="button" or as={Link}. */
  interactive?: boolean
  radius?: SurfaceRadius
  padding?: SurfacePadding
  children?: ReactNode
  className?: string
}

const RADIUS: Record<SurfaceRadius, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

const PADDING: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const TONE: Record<SurfaceTone, string> = {
  solid:
    'border border-v2-border/60 bg-v2-surface dark:bg-v2-surface shadow-sm shadow-black/[0.02] dark:shadow-black/30',
  subtle:
    'border border-v2-border/40 bg-v2-surface/60 dark:bg-v2-surface/40',
}

const INTERACTIVE =
  'cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-v2-border hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground'

type SurfaceProps<E extends ElementType> = SurfaceOwnProps & {
  as?: E
} & Omit<ComponentPropsWithoutRef<E>, keyof SurfaceOwnProps | 'as'>

function SurfaceImpl<E extends ElementType = 'div'>(
  {
    as,
    tone = 'solid',
    interactive = false,
    radius = 'xl',
    padding = 'none',
    className,
    children,
    ...rest
  }: SurfaceProps<E>,
  ref: Ref<Element>,
) {
  const Comp = (as ?? 'div') as ElementType
  return (
    <Comp
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        RADIUS[radius],
        TONE[tone],
        PADDING[padding],
        interactive && INTERACTIVE,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/**
 * Surface — reusable floating panel used for vault cards, activity rows,
 * buttons, and any other content that needs to sit *above* the canvas grid
 * rather than blend into it. Solid background (white in light, near-black in
 * dark), hairline border, subtle shadow.
 *
 * Set `interactive` for clickable surfaces (vault cards, activity rows).
 * Use `as="button"` or `as={Link}` to render the right element.
 */
export const Surface = forwardRef(SurfaceImpl) as <E extends ElementType = 'div'>(
  props: SurfaceProps<E> & { ref?: Ref<Element> },
) => ReturnType<typeof SurfaceImpl>
