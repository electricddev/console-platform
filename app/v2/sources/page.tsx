'use client'

import { motion } from 'framer-motion'

export default function V2SourcesPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
        {'// pipeline · sources'}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">Sources</h1>
      <p className="mt-2 max-w-prose text-sm text-v2-muted">
        Registered data connectors and ingestion endpoints. Configure pull-based or push-based pipelines from originators and third-party providers.
      </p>
    </motion.div>
  )
}
