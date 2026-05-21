'use client'

import { useReducer, useTransition } from 'react'
import { toast } from 'sonner'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { setupReducer, type SetupAction, type SetupState } from './setup-reducer'
import { AuthStep } from './auth-step'
import { DiscoveryStep } from './discovery-step'
import { SelectStep } from './select-step'
import { createConnection } from '@/app/(originator)/sources/actions'

const STEP_LABEL: Record<'auth' | 'discovering' | 'select' | 'submitting' | 'error', string> = {
  auth: 'Connect',
  discovering: 'Discover',
  select: 'Confirm',
  submitting: 'Saving',
  error: 'Error',
}

type Props = {
  connectorId: string
  onDone: (connectionId: string) => void
  onCancel: () => void
}

export function SetupShell({ connectorId, onDone, onCancel }: Props) {
  const initial: SetupState = { step: 'auth', connectorId, authPayload: {} }
  const [state, dispatch] = useReducer(setupReducer, initial)
  const [, startTransition] = useTransition()
  const reducedMotion = useReducedMotion()

  function submitSave(s: SetupState) {
    if (s.step !== 'select') return
    dispatch({ type: 'submitSelect' } satisfies SetupAction)
    startTransition(async () => {
      const result = await createConnection({
        connectorId,
        name: connectorNameFromAuth(connectorId, s.authPayload),
        authPayload: s.authPayload,
        datasetIds: s.selectedIds,
      })
      if (result.ok && result.data) {
        dispatch({ type: 'saveSuccess', connectionId: result.data.id })
        toast.success('Connected')
        onDone(result.data.id)
      } else if (!result.ok) {
        dispatch({ type: 'saveFailure', error: result.error })
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <StepStrip current={state.step === 'idle' || state.step === 'done' ? 'auth' : state.step} />

      <motion.div
        key={state.step}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.18 }}
        className="min-h-[160px]"
      >
        {state.step === 'auth' && (
          <AuthStep
            connectorId={connectorId}
            values={state.authPayload}
            onUpdate={(patch) => dispatch({ type: 'updateAuth', patch })}
            onSubmit={() => dispatch({ type: 'submitAuth' })}
            onCancel={onCancel}
          />
        )}
        {state.step === 'discovering' && (
          <DiscoveryStep
            connectorId={connectorId}
            onComplete={(discovered) => dispatch({ type: 'discoveryComplete', discovered })}
            onCancel={onCancel}
          />
        )}
        {(state.step === 'select' || state.step === 'submitting') && (
          <SelectStep
            discovered={state.discovered}
            selectedIds={state.selectedIds}
            onToggle={(id) => dispatch({ type: 'toggleDataset', id })}
            onToggleAll={() => {
              if (state.step !== 'select' && state.step !== 'submitting') return
              const allSelected = state.selectedIds.length === state.discovered.length
              for (const d of state.discovered) {
                const present = state.selectedIds.includes(d.id)
                if (allSelected === present) dispatch({ type: 'toggleDataset', id: d.id })
              }
            }}
            onConfirm={() => submitSave(state)}
            onCancel={onCancel}
            submitting={state.step === 'submitting'}
          />
        )}
        {state.step === 'error' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-[oklch(0.55_0.18_25)]">{state.error}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'retry' })}
                className="rounded-md border border-v2-foreground bg-v2-foreground px-3 py-1.5 text-[12px] text-v2-background hover:bg-v2-foreground/90"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function connectorNameFromAuth(connectorId: string, authPayload: Record<string, unknown>): string {
  if (connectorId === 's3' && typeof authPayload.bucket === 'string') return authPayload.bucket
  if (connectorId === 'file-upload' && typeof authPayload.label === 'string') return authPayload.label
  return connectorId
}

function StepStrip({ current }: { current: keyof typeof STEP_LABEL }) {
  const visible: Array<keyof typeof STEP_LABEL> = ['auth', 'discovering', 'select']
  return (
    <ol className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-v2-muted/65">
      {visible.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn('font-medium', s === current && 'text-v2-foreground')}>{STEP_LABEL[s]}</span>
          {i < visible.length - 1 && <span aria-hidden="true">·</span>}
        </li>
      ))}
    </ol>
  )
}
