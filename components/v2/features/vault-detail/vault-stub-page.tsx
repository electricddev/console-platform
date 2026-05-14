'use client'

import { motion } from 'framer-motion'
import { Surface } from '@/components/v2/ui/surface'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

interface Props {
  vault: Vault
  title: string
  description: string
}

export function VaultStubPage({ vault, title, description }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4"
    >
      <header className="flex flex-col gap-1.5">
        <p className="text-[12px] tracking-tight text-v2-muted/80">
          {vault.symbol} · {vault.sponsor}
        </p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-v2-foreground">
          {title}
        </h1>
        <p className="max-w-prose text-[14px] text-v2-muted">{description}</p>
      </header>
      <Surface radius="xl" className="flex items-center justify-center p-10">
        <p className="text-[13px] text-v2-muted/80">Coming soon.</p>
      </Surface>
    </motion.div>
  )
}
