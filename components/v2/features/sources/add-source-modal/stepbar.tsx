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
      className="flex items-center gap-2 px-5 py-3.5 text-[10px] uppercase tracking-[0.12em] text-v2-muted/65"
    >
      {VISIBLE_STEPS.map((s, i) => (
        <li key={s} aria-current={i === currentIndex ? 'step' : undefined} className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium',
              i === currentIndex && 'text-v2-foreground',
              i < currentIndex && 'text-v2-muted',
            )}
          >
            {STEP_LABEL[s]}
          </span>
          {i < VISIBLE_STEPS.length - 1 && (
            <span aria-hidden="true">·</span>
          )}
        </li>
      ))}
    </ol>
  )
}
