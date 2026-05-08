import type { Density } from '@/lib/auth/types'

export function DensityToggle({ current }: { current: Density }) {
  const next: Density = current === 'compact' ? 'comfortable' : 'compact'
  return (
    <form action="/density-switch" method="post" className="contents">
      <input type="hidden" name="density" value={next} />
      <button type="submit" className="w-full text-left">
        Density: {current} → {next}
      </button>
    </form>
  )
}
