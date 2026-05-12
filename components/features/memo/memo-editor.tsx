'use client'
import { useTransition } from 'react'
import { MemoSectionShell } from './memo-section-shell'
import { MemoSectionEditor } from './memo-section-editor'
import { MemoInsertPicker } from './memo-insert-picker'
import { MemoInsertBlock } from './memo-insert-block'
import { MemoFlagChecklist } from './memo-flag-checklist'
import { MemoStatusBar } from './memo-status-bar'
import { MemoAuditLog } from './memo-audit-log'
import {
  actionUpdateMemoSection, actionRecordFlagDecision,
  actionSubmitMemo, actionApproveMemo, actionRequestMemoChanges,
} from '@/app/(app)/datasets/[datasetId]/memo/actions'
import type { Memo, MemoSection, RedFlag, Role, FlagDecision } from '@/lib/api/schemas'

const SECTIONS: { key: keyof Memo['sections']; letter: string; name: string; prompt: string }[] = [
  { key: 'character',  letter: 'C', name: 'Character',  prompt: 'Issuer track record and reputation.' },
  { key: 'capacity',   letter: 'C', name: 'Capacity',   prompt: 'Ability to service debt across the cycle.' },
  { key: 'capital',    letter: 'C', name: 'Capital',    prompt: 'Composition of the portfolio.' },
  { key: 'collateral', letter: 'C', name: 'Collateral', prompt: 'Seniority and concentration.' },
  { key: 'conditions', letter: 'C', name: 'Conditions', prompt: 'Macro and sector exposure.' },
]

export function MemoEditor({ memo, redFlags, userRole }: { memo: Memo; redFlags: RedFlag[]; userRole: Role }) {
  const [pending, startTransition] = useTransition()
  const readOnly = memo.status !== 'draft'

  function saveSection(key: keyof Memo['sections'], section: MemoSection) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        await actionUpdateMemoSection(memo.id, key, section)
        resolve()
      })
    })
  }

  function insertIntoSection(key: keyof Memo['sections'], methodologyId: string) {
    const current = memo.sections[key]
    const nextSection: MemoSection = {
      markdown: current.markdown,
      inserts: [...current.inserts, {
        id: `ins_${methodologyId}_${Date.now()}`,
        methodologyId,
        insertedAt: new Date().toISOString(),
      }],
    }
    startTransition(() => { actionUpdateMemoSection(memo.id, key, nextSection) })
  }

  function recordDecision(partial: Omit<FlagDecision, 'decidedAt' | 'decidedBy'>) {
    const decision: FlagDecision = {
      ...partial,
      decidedAt: new Date().toISOString(),
      decidedBy: memo.authorId,
    }
    startTransition(() => { actionRecordFlagDecision(memo.id, decision) })
  }

  return (
    <div className="grid gap-6">
      <MemoStatusBar
        memoStatus={memo.status}
        userRole={userRole}
        onSubmit={() => startTransition(() => { actionSubmitMemo(memo.id) })}
        onApprove={() => startTransition(() => { actionApproveMemo(memo.id) })}
        onRequestChanges={() => startTransition(() => { actionRequestMemoChanges(memo.id, '') })}
      />

      {SECTIONS.map((s) => (
        <MemoSectionShell key={s.key} letter={s.letter} name={s.name} prompt={s.prompt}>
          <MemoSectionEditor
            initialMarkdown={memo.sections[s.key].markdown}
            readOnly={readOnly}
            onSave={(md) => saveSection(s.key, { markdown: md, inserts: memo.sections[s.key].inserts })}
          />
          <div className="grid gap-2">
            {memo.sections[s.key].inserts.map((insert, i) => (
              <MemoInsertBlock key={insert.id} insert={insert} footnoteNumber={i + 1} />
            ))}
          </div>
          {!readOnly && <MemoInsertPicker sectionKey={s.key} onInsert={(id) => insertIntoSection(s.key, id)} />}
        </MemoSectionShell>
      ))}

      <section className="rounded-lg border border-border bg-surface/40 p-5">
        <h3 className="mb-3 font-tag text-foreground/60">{'// red-flag checklist'}</h3>
        <MemoFlagChecklist flags={redFlags} decisions={memo.flagDecisions} onDecide={recordDecision} readOnly={readOnly} />
      </section>

      <MemoAuditLog memo={memo} />

      {pending && <p className="sr-only">Saving…</p>}
    </div>
  )
}
