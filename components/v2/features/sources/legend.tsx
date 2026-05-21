'use client'

export function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-md border border-v2-border/60 bg-v2-surface/95 px-2 py-1 text-[10px] text-v2-muted/80 backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.55_0.10_150)]" /> healthy
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.70_0.14_70)]" /> attention
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.55_0.18_25)]" /> error
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-v2-muted/60" /> paused
      </span>
    </div>
  )
}
