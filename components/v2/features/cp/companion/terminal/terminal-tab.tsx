'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCompanionContext } from '../companion-context'
import type { TerminalMode } from '../companion-panel.types'
import { BridgeMode } from './bridge-mode'
import { AssistantMode } from './assistant-mode'
import { CliMode } from './cli-mode'

const MODES: { value: TerminalMode; label: string }[] = [
  { value: 'bridge', label: 'Bridge' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'cli', label: 'CLI' },
]

const STORAGE_KEY = 'analysis-workbench:terminal-mode'

export function TerminalTab() {
  const { vault } = useCompanionContext()
  const [mode, setMode] = useState<TerminalMode>(() => {
    if (typeof window === 'undefined') return 'cli'
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === 'bridge' || stored === 'assistant' || stored === 'cli') return stored
    return 'cli'
  })

  const onChange = (m: TerminalMode) => {
    setMode(m)
    if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, m)
  }

  const slug = vault?.id ?? 'workbench'
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-v2-border/60 px-3 py-1.5">
        <div role="tablist" aria-label="Terminal mode" className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              role="tab"
              aria-selected={mode === m.value}
              tabIndex={mode === m.value ? 0 : -1}
              onClick={() => onChange(m.value)}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10.5px] transition-colors',
                mode === m.value
                  ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                  : 'text-v2-muted hover:text-v2-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-v2-muted">
          hyve@{slug} · {time}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === 'bridge' && <BridgeMode />}
        {mode === 'assistant' && <AssistantMode />}
        {mode === 'cli' && <CliMode />}
      </div>
    </div>
  )
}
