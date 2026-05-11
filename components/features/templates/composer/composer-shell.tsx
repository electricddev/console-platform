'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type * as Monaco from 'monaco-editor'
import { cn } from '@/lib/utils'
import { ComposerTopbar } from './composer-topbar'
import { SchemaBrowser } from './schema-browser'
import { NlInput } from './nl-input'
import { HqlEditor } from './hql-editor'
import { ComposerBottom } from './composer-bottom'
import { ComposerStatusbar } from './composer-statusbar'
import type { Schema } from '@/lib/api/types'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

// App shell topbar height from CSS var --topbar-height = 3rem = 48px
const APP_TOPBAR_HEIGHT = 48

type Props = {
  datasetId: string
  schemaId: string
  schema: Schema | null
  initialPrompt?: string
  initialDsl?: string
  initialName?: string
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
  onPrivacyAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
  onSaveDraft: (input: { name: string; description: string; dsl: string }) => Promise<{ id: string }>
  onSubmit?: (input: { name: string; description: string; dsl: string }) => Promise<{ id: string }>
}

export function ComposerShell(props: Props) {
  const router = useRouter()
  const [name, setName] = useState(props.initialName ?? '')
  const [description, setDescription] = useState('')
  const [dsl, setDsl] = useState(props.initialDsl ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track which surface is "active" for schema browser insert
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const nlTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const canSave = name.trim().length > 0 && dsl.trim().length > 0 && !saving

  async function save() {
    if (saving) return
    setSaveError(null)
    setSaving(true)
    try {
      const result = await props.onSaveDraft({ name, description, dsl })
      router.push(`/templates/${result.id}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function submit() {
    if (props.onSubmit) {
      await props.onSubmit({ name, description, dsl })
    } else {
      console.log('submit', { name, description, dsl })
    }
  }

  // Insert text from schema browser into the appropriate surface
  const handleSchemaInsert = useCallback((fieldName: string) => {
    // Check if NL textarea is currently focused
    const active = document.activeElement
    const isNlActive =
      active instanceof HTMLTextAreaElement &&
      active === nlTextareaRef.current

    if (isNlActive && nlTextareaRef.current) {
      const ta = nlTextareaRef.current
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? start
      const before = ta.value.slice(0, start)
      const after = ta.value.slice(end)
      // Can't directly set via React here, so we dispatch an input event
      const newValue = before + fieldName + after
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set
      nativeInputValueSetter?.call(ta, newValue)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      ta.setSelectionRange(start + fieldName.length, start + fieldName.length)
      ta.focus()
      return
    }

    // Default: insert into HQL editor at cursor
    if (editorRef.current) {
      const editor = editorRef.current
      const position = editor.getPosition()
      editor.executeEdits('schema-browser-insert', [
        {
          range: {
            startLineNumber: position?.lineNumber ?? 1,
            startColumn: position?.column ?? 1,
            endLineNumber: position?.lineNumber ?? 1,
            endColumn: position?.column ?? 1,
          },
          text: fieldName,
          forceMoveMarkers: true,
        },
      ])
      editor.focus()
    }
  }, [])

  const dslLineCount = dsl.split('\n').filter((l) => l.length > 0).length

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: `calc(100dvh - ${APP_TOPBAR_HEIGHT}px)` }}
    >
      {/* Top bar */}
      <ComposerTopbar
        datasetId={props.datasetId}
        schemaId={props.schemaId}
        name={name}
        onSave={save}
        onSubmit={submit}
        saving={saving}
        canSave={canSave}
      />

      {/* Name + description — compact strip, ~32px tall */}
      <div className="flex h-8 items-stretch border-b border-foreground/[0.12] bg-muted/30">
        {/* Name field */}
        <div
          className={cn(
            'flex flex-1 min-w-0 items-center gap-2 border-l-[2px] border-l-transparent px-6 md:px-8',
            'transition-colors focus-within:border-l-accent focus-within:bg-background/60',
          )}
        >
          <label htmlFor="t-name" className="font-tag text-[0.62rem] text-foreground/40 shrink-0">
            name
          </label>
          <input
            id="t-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="weighted advance rate by sector"
            className={cn(
              'flex-1 min-w-0 bg-transparent border-0 py-0 font-mono text-[0.78rem] text-foreground',
              'placeholder:text-muted-foreground/35',
              'focus:outline-none',
            )}
          />
        </div>

        {/* Vertical divider */}
        <span aria-hidden className="w-px bg-border" />

        {/* Description field */}
        <div
          className={cn(
            'flex flex-1 min-w-0 items-center gap-2 border-l-[2px] border-l-transparent px-4 md:px-6',
            'transition-colors focus-within:border-l-accent focus-within:bg-background/60',
          )}
        >
          <label htmlFor="t-desc" className="font-tag text-[0.62rem] text-foreground/40 shrink-0">
            description
          </label>
          <input
            id="t-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="what does this template answer?"
            className={cn(
              'flex-1 min-w-0 bg-transparent border-0 py-0 font-mono text-[0.78rem] text-foreground',
              'placeholder:text-muted-foreground/35',
              'focus:outline-none',
            )}
          />
        </div>

        {saveError && (
          <p
            role="alert"
            className="font-mono text-[0.7rem] text-destructive shrink-0 px-4 self-center"
          >
            {saveError}
          </p>
        )}
      </div>

      {/* Three-zone layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Schema browser */}
        <SchemaBrowser
          schema={props.schema}
          onInsert={handleSchemaInsert}
        />

        {/* Center: NL input + HQL editor + bottom panel */}
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* NL input — compresses when HQL is present */}
          <NlInput
            datasetId={props.datasetId}
            initialPrompt={props.initialPrompt}
            compact={dsl.length > 0}
            onCompileStream={props.onCompileStream}
            onCompiled={setDsl}
          />

          {/* HQL editor — fills remaining vertical space */}
          <div className="flex flex-1 min-h-0 flex-col bg-background">
            {/* Editor zone header — calm strip on the canvas */}
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-background px-6 md:px-8">
              <span className="font-tag text-[0.62rem] text-foreground/55">
                hql
              </span>
              <span className="font-mono text-[0.65rem] tabular-nums text-foreground/40">
                {dslLineCount} {dslLineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <HqlEditor
                value={dsl}
                onChange={setDsl}
                schema={props.schema}
                onReady={(editor) => {
                  editorRef.current = editor
                }}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Bottom panel — fixed 280px */}
          <ComposerBottom
            dsl={dsl}
            schemaId={props.schemaId}
            datasetId={props.datasetId}
            schema={props.schema}
            fetchPrivacy={props.onPrivacyAnalysis}
            className="h-[280px] shrink-0"
          />
        </main>
      </div>

      {/* Status bar */}
      <ComposerStatusbar
        schema={props.schema}
        datasetId={props.datasetId}
        hqlLineCount={dslLineCount}
      />
    </div>
  )
}
