'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Small copy-to-clipboard button. Wires navigator.clipboard when available. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // silently ignore in environments without clipboard access
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-v2-muted/60 transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-v2-success" strokeWidth={2} />
      ) : (
        <Copy className="h-3 w-3" strokeWidth={1.75} />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
