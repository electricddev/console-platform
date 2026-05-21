'use client'

export function CategoryLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute text-[9.5px] font-medium uppercase tracking-[0.14em] text-v2-muted/65"
      style={{ left: x, top: y }}
    >
      {label}
    </div>
  )
}
