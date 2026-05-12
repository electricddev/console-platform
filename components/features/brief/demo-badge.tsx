export function DemoBadge({ title = 'Illustrative mock — not live data' }: { title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-sm border border-dashed border-foreground/30 bg-foreground/5 px-1.5 py-0.5 text-[0.6rem] font-tag uppercase tracking-wider text-foreground/55"
    >
      demo
    </span>
  )
}
