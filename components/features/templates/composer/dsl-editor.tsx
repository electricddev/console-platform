'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr:false prevents Monaco from attempting to run in Node
// during SSR — the worker-based architecture is browser-only.
const Editor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-md bg-muted" /> }
)

type Props = {
  value: string
  onChange: (next: string) => void
  height?: number
}

export function DslEditor({ value, onChange, height = 320 }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border" style={{ height }}>
      <Editor
        height={height}
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          tabSize: 2,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  )
}
