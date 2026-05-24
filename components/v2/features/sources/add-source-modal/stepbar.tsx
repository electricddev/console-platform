import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const VISIBLE_STEPS = ['auth', 'trust', 'discover', 'confirm'] as const
type VisibleStep = (typeof VISIBLE_STEPS)[number]
const STEP_LABEL: Record<VisibleStep, string> = {
  auth: 'Connect',
  trust: 'Review',
  discover: 'Discover',
  confirm: 'Confirm',
}

type Props = { current: VisibleStep | 'done' | 'picker' }

export function Stepbar({ current }: Props) {
  if (current === 'picker' || current === 'done') return null
  const currentIndex = VISIBLE_STEPS.indexOf(current as VisibleStep)
  return (
    <ol
      aria-label="Setup progress"
      className="flex items-center gap-3 px-6 pt-5 pb-4 font-mono text-[10px] uppercase tracking-[0.14em]"
    >
      {VISIBLE_STEPS.map((s, i) => {
        const active = i === currentIndex
        const complete = i < currentIndex
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium leading-none transition-colors',
                active && 'bg-v2-foreground text-v2-background',
                complete && 'bg-v2-foreground/15 text-v2-foreground',
                !active && !complete && 'border border-v2-border text-v2-muted/60',
              )}
            >
              {complete ? <Check className="size-3" strokeWidth={2.5} /> : i + 1}
            </span>
            <span
              className={cn(
                'transition-colors',
                active ? 'text-v2-foreground' : complete ? 'text-v2-muted' : 'text-v2-muted/45',
              )}
            >
              {STEP_LABEL[s]}
            </span>
            {i < VISIBLE_STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px w-7 bg-v2-border/80" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
