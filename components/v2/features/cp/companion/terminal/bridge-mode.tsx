'use client'
import { useState } from 'react'
import { Check, Copy, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tool = { id: string; name: string; summary: string; enabled: boolean }

const INITIAL_TOOLS: Tool[] = [
  { id: 'read_schema', name: 'read_schema', summary: 'Inspect the vault schema and field types.', enabled: true },
  { id: 'propose_sql', name: 'propose_sql', summary: 'Propose a SQL edit to the editor.', enabled: true },
  { id: 'dry_run', name: 'dry_run', summary: 'Execute the current SELECT against a snapshot.', enabled: true },
  { id: 'run_tests', name: 'run_tests', summary: 'Run the defined assertions.', enabled: false },
  { id: 'read_destinations', name: 'read_destinations', summary: 'Read configured destinations.', enabled: true },
]

const DEMO_EVENTS = [
  { ts: '14:22:01', name: 'read_schema(vault.acred)', detail: '14 cols' },
  { ts: '14:22:14', name: 'propose_sql(SELECT nav, …)', detail: 'diff staged' },
  { ts: '14:22:18', name: 'dry_run()', detail: '340ms · 3 rows' },
  { ts: '14:22:34', name: 'run_tests()', detail: '3 passed · 1 failed' },
  { ts: '14:22:51', name: 'read_destinations()', detail: '2 on-chain · 0 off-chain' },
]

export function BridgeMode() {
  const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS)
  const [demo, setDemo] = useState(false)
  const [copied, setCopied] = useState(false)
  const WSS = 'wss://hyve.app/agent/abc123-replace-me'

  const toggleTool = (id: string) =>
    setTools((ts) => ts.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)))

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WSS)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-3">
      {/* Beta + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-v2-warning/15 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-warning">
            Beta
          </span>
          <span
            className="font-mono text-[10.5px] text-v2-muted"
            title="The bridge endpoint isn't live yet. This UI demonstrates the eventual UX."
          >
            ○ Awaiting connection
          </span>
        </div>
        <label className="inline-flex items-center gap-1 font-mono text-[10px] text-v2-muted">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Demo data
        </label>
      </div>

      {/* Connection */}
      <div className="space-y-2 rounded-lg border border-v2-border/60 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted">Connection</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-v2-foreground/[0.04] px-2 py-1 font-mono text-[11px] text-v2-foreground">
            {WSS}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border border-v2-border/60 px-2 py-0.5 font-mono text-[10px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-v2-success" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            disabled
            title="Beta — endpoint not live"
            className="inline-flex items-center gap-1 rounded border border-v2-danger/30 px-2 py-0.5 font-mono text-[10px] text-v2-danger/50 disabled:cursor-not-allowed"
          >
            <Power className="h-3 w-3" />
            Revoke
          </button>
        </div>
        <details className="font-mono text-[10px] text-v2-muted">
          <summary className="cursor-pointer hover:text-v2-foreground">How to connect</summary>
          <pre className="mt-1 whitespace-pre-wrap text-[10px]">
{`claude code mcp add hyve --transport=websocket \\
  --url=${WSS}`}
          </pre>
        </details>
      </div>

      {/* Tools + Event log */}
      <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr] gap-2">
        <div className="space-y-1.5 overflow-y-auto rounded-lg border border-v2-border/60 p-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Tools</p>
          {tools.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-1.5 rounded px-1 py-1 hover:bg-v2-foreground/[0.04]"
            >
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={() => toggleTool(t.id)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block font-mono text-[10.5px]',
                    t.enabled ? 'text-v2-foreground' : 'text-v2-muted',
                  )}
                >
                  {t.name}
                </span>
                <span className="block font-mono text-[9px] leading-tight text-v2-muted">
                  {t.summary}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="overflow-y-auto rounded-lg border border-v2-border/60 p-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Event log</p>
          {!demo ? (
            <p className="mt-2 font-mono text-[10.5px] text-v2-muted">
              No events. Connect an agent to see live tool calls here, or toggle Demo data above.
            </p>
          ) : (
            <ul role="log" aria-live="polite" className="mt-2 space-y-1 font-mono text-[10.5px]">
              {DEMO_EVENTS.map((e, i) => (
                <li key={i} className="grid grid-cols-[64px_1fr_max-content] items-baseline gap-2">
                  <span className="tabular-nums text-v2-muted">{e.ts}</span>
                  <span className="text-v2-foreground">{e.name}</span>
                  <span className="text-v2-muted">{e.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
