'use client'

import { motion } from 'framer-motion'

export default function V2IssuersPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
        {'// issuers'}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">Issuers</h1>
      <p className="mt-2 max-w-prose text-sm text-v2-muted">
        Coming up next. The v2 issuers view will reuse the existing /issuers fixtures with the new shell.
      </p>
    </motion.div>
  )
}
