'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { saveConfig, type AssistantProvider, type AssistantConfig } from './assistant-storage'

const PROVIDERS: { value: AssistantProvider; label: string; note: string }[] = [
  { value: 'anthropic-gateway', label: 'Anthropic (via Vercel AI Gateway)', note: 'Default — fastest route to Claude.' },
  { value: 'openai', label: 'OpenAI', note: 'Use a sk-… key.' },
  { value: 'openrouter', label: 'OpenRouter', note: 'Use a sk-or-… key.' },
]

export function AssistantKeyPrompt({ onConfigured }: { onConfigured: (c: AssistantConfig) => void }) {
  const [provider, setProvider] = useState<AssistantProvider>('anthropic-gateway')
  const [key, setKey] = useState('')

  const handleSave = () => {
    if (!key.trim()) return
    const cfg = { provider, key: key.trim() }
    saveConfig(cfg)
    onConfigured(cfg)
  }

  return (
    <div className="flex h-full items-center justify-center px-4 py-3">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-v2-border/60 bg-v2-foreground/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-v2-muted" />
          <p className="font-mono text-[11px] font-medium text-v2-foreground">Bring your own key</p>
        </div>
        <p className="font-mono text-[10.5px] leading-relaxed text-v2-muted">
          Your key is stored only in this browser&apos;s localStorage. Hyve cannot read it — requests go direct to the provider.
        </p>
        <div className="space-y-2">
          <label className="block font-mono text-[10.5px] text-v2-muted">
            Provider
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AssistantProvider)}
              className="mt-1 block w-full rounded border border-v2-border/60 bg-transparent px-2 py-1 font-mono text-[10.5px] text-v2-foreground"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <p className="font-mono text-[9.5px] text-v2-muted">{PROVIDERS.find((p) => p.value === provider)?.note}</p>
          <label className="block font-mono text-[10.5px] text-v2-muted">
            API key
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="mt-1 block w-full rounded border border-v2-border/60 bg-transparent px-2 py-1 font-mono text-[11px] text-v2-foreground placeholder:text-v2-muted/60"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full rounded bg-v2-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-v2-surface transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
        >
          Save and continue
        </button>
      </div>
    </div>
  )
}
