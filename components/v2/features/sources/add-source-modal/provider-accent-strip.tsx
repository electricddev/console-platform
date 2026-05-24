'use client'

const COLORS: Record<string, string> = {
  stripe: '#635bff',
  plaid: '#0a85ea',
  quickbooks: '#2ca01c',
  xero: '#13b5ea',
  s3: '#ff9900',
}

type Props = { connectorId: string | null }

export function ProviderAccentStrip({ connectorId }: Props) {
  if (!connectorId) return <div aria-hidden="true" className="h-[3px] w-full" />
  const color = COLORS[connectorId] ?? 'var(--v2-foreground)'
  return (
    <div
      aria-hidden="true"
      className="h-[3px] w-full shrink-0"
      style={{ background: color, opacity: 0.85 }}
    />
  )
}
