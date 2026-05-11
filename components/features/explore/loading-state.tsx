'use client'

export function LoadingState({ label = 'Initializing query engine…' }: { label?: string }) {
  return (
    <div className="grid h-[40vh] place-items-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/40" />
        <span>{label}</span>
      </div>
    </div>
  )
}
