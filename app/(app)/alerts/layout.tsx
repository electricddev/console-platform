import Link from 'next/link'
import { PageHeader } from '@/components/common/page-header'

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// subscriptions"
        title="Alerts"
        description="Cross-portfolio anomaly stream, alert rules, and notification channels."
      />
      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Alerts sections">
        {[
          { href: '/alerts',          label: 'Feed' },
          { href: '/alerts/rules',    label: 'Rules' },
          { href: '/alerts/channels', label: 'Channels' },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-2 text-sm hover:bg-muted/40">
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  )
}
