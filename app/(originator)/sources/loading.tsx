export default function Loading() {
  return (
    <div className="px-8 pt-6">
      <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
        {'// pipeline · sources'}
      </p>
      <div className="mt-2 h-8 w-48 animate-pulse rounded bg-v2-foreground/[0.06]" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-v2-foreground/[0.04]" />
    </div>
  )
}
