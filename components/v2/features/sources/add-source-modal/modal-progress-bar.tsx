'use client'

type Props = { percent: number }

export function ModalProgressBar({ percent }: Props) {
  return (
    <div aria-hidden="true" className="h-0.5 w-full bg-v2-border/40">
      <div
        className="h-full bg-v2-green transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
