'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useCompanionContext } from '../companion-context'
import { loadConfig, clearConfig, type AssistantConfig } from './assistant-storage'
import { AssistantKeyPrompt } from './assistant-key-prompt'
import { AssistantDiffProposal } from './assistant-diff-proposal'

type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; proposal?: string }

// Stubbed response. Real network wiring is a follow-up — V1 ships this UX with a deterministic mock.
function mockResponse(userText: string, currentCode: string): { content: string; proposal?: string } {
  if (/last quarter|q[1-4]|quarter/i.test(userText)) {
    return {
      content:
        "Sure — I'll filter to executions from the last quarter. Here's the proposed edit (apply if it looks right):",
      proposal: currentCode.includes('WHERE')
        ? currentCode.replace(/WHERE[\s\S]*?(?=$|;)/, "WHERE asof >= '2026-04-01'")
        : currentCode.trim().replace(/(FROM[\s\S]*?)$/m, "$1\nWHERE asof >= '2026-04-01'"),
    }
  }
  if (/limit/i.test(userText)) {
    return {
      content: 'Adding a LIMIT clause:',
      proposal: currentCode.trim() + '\nLIMIT 100',
    }
  }
  return {
    content:
      "I can help shape this SELECT. Try: _'filter to last quarter'_, _'add a LIMIT'_, or describe the output columns you want.",
  }
}

type MdComponent = (props: { children: string }) => ReactNode

export function AssistantMode() {
  const { code, onCodeChange } = useCompanionContext()
  const [config, setConfig] = useState<AssistantConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [Md, setMd] = useState<MdComponent | null>(null)

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  // Lazy-load react-markdown only when we have config.
  useEffect(() => {
    if (!config) return
    let cancelled = false
    void (async () => {
      const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
        import('react-markdown'),
        import('remark-gfm'),
      ])
      if (cancelled) return
      const Component = (p: { children: string }) => (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.children}</ReactMarkdown>
      )
      setMd(() => Component)
    })()
    return () => { cancelled = true }
  }, [config])

  if (!config) {
    return <AssistantKeyPrompt onConfigured={setConfig} />
  }

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    const response = mockResponse(text, code)
    setMessages((m) => [
      ...m,
      { role: 'user', content: text },
      { role: 'assistant', content: response.content, proposal: response.proposal },
    ])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-v2-border/60 px-3 py-1.5 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-v2-success/15 px-1.5 py-0.5 text-v2-success">● {config.provider}</span>
          <span className="text-v2-muted">Mock responses — real LLM wiring is a follow-up.</span>
        </div>
        <button
          type="button"
          onClick={() => { clearConfig(); setConfig(null); setMessages([]) }}
          className="text-v2-muted hover:text-v2-danger"
        >
          Remove key
        </button>
      </div>

      <div role="log" aria-live="polite" className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="font-mono text-[10.5px] text-v2-muted">
            Ask the assistant to shape this SELECT — e.g. <em>&ldquo;filter to last quarter&rdquo;</em> or <em>&ldquo;add a LIMIT&rdquo;</em>.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="font-mono text-[11px] text-v2-foreground max-w-none">
              {Md && m.role === 'assistant' ? <Md>{m.content}</Md> : <p>{m.content}</p>}
            </div>
            {m.role === 'assistant' && m.proposal && (
              <AssistantDiffProposal
                currentCode={code}
                proposedCode={m.proposal}
                onApply={() => {
                  if (onCodeChange) onCodeChange(m.proposal!)
                  // Mark the proposal as applied — collapse out by clearing it.
                  setMessages((all) => all.map((x, j) => j === i ? { ...x, proposal: undefined } : x))
                }}
                onDiscard={() => {
                  setMessages((all) => all.map((x, j) => j === i ? { ...x, proposal: undefined } : x))
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-v2-border/60 px-3 py-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Ask the assistant…"
          rows={2}
          aria-label="Assistant input"
          className="w-full resize-none bg-transparent font-mono text-[11px] text-v2-foreground placeholder:text-v2-muted/60 outline-none"
        />
      </div>
    </div>
  )
}
