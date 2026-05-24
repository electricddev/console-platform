'use client'

type Props = { step?: string; label?: string }

export function ModalEyebrow({ step, label }: Props) {
  if (!step && !label) return null
  return (
    <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-v2-muted/70">
      {step ? `Step ${step}` : null}
      {step && label ? ' / ' : null}
      {label ?? null}
    </div>
  )
}
