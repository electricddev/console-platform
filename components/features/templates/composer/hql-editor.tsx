'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useCallback, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import { registerHql } from './hql-monarch'
import type { Schema } from '@/lib/api/types'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full animate-pulse bg-muted/30"
        aria-label="Loading editor…"
      />
    ),
  },
)

type EditorInstance = Monaco.editor.IStandaloneCodeEditor
type MonacoInstance = typeof Monaco

type Props = {
  value: string
  onChange: (next: string) => void
  schema?: Schema | null
  onReady?: (editor: EditorInstance) => void
  className?: string
}

function useEditorTheme(): 'hql-light' | 'hql-dark' {
  const [theme, setTheme] = useState<'hql-light' | 'hql-dark'>('hql-light')

  useEffect(() => {
    const root = document.documentElement
    const update = () =>
      setTheme(root.classList.contains('dark') ? 'hql-dark' : 'hql-light')
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

export function HqlEditor({ value, onChange, schema, onReady, className }: Props) {
  const editorRef = useRef<EditorInstance | null>(null)
  const monacoRef = useRef<MonacoInstance | null>(null)
  const completionProviderRef = useRef<Monaco.IDisposable | null>(null)
  const editorTheme = useEditorTheme()

  // Register completion provider whenever schema changes
  const registerCompletions = useCallback(
    (monaco: MonacoInstance, currentSchema: Schema | null | undefined) => {
      // Dispose old provider if any
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose()
        completionProviderRef.current = null
      }

      if (!currentSchema) return

      completionProviderRef.current = monaco.languages.registerCompletionItemProvider('hql', {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          )
          const suggestions = currentSchema.fields.map((field) => ({
            label: field.name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: `${field.type} · ${field.exposure}`,
            documentation: field.description,
            insertText: field.name,
            range,
          }))
          return { suggestions }
        },
      })
    },
    [],
  )

  // Re-register completions when schema changes
  useEffect(() => {
    if (monacoRef.current) {
      registerCompletions(monacoRef.current, schema)
    }
  }, [schema, registerCompletions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      completionProviderRef.current?.dispose()
    }
  }, [])

  function handleMount(editor: EditorInstance, monaco: MonacoInstance) {
    editorRef.current = editor
    monacoRef.current = monaco

    // Register HQL language + themes
    registerHql(monaco)

    // Register completions
    registerCompletions(monaco, schema)

    // Apply theme immediately
    const isDark = document.documentElement.classList.contains('dark')
    monaco.editor.setTheme(isDark ? 'hql-dark' : 'hql-light')

    onReady?.(editor)
  }

  return (
    <div className={className ?? 'h-full w-full'}>
      <MonacoEditor
        height="100%"
        defaultLanguage="hql"
        theme={editorTheme}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          tabSize: 2,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'gutter',
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          roundedSelection: false,
          wordWrap: 'off',
          automaticLayout: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  )
}
