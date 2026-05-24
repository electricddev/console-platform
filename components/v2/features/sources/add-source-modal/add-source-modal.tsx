'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { Stepbar } from './stepbar'
import { PickerView } from './picker-view'
import { HyveBridge } from './hyve-bridge'
import { AuthStep } from './steps/auth-step'
import { TrustStep } from './steps/trust-step'
import { DiscoverStep } from './steps/discover-step'
import { ConfirmStep } from './steps/confirm-step'
import { DoneStep } from './steps/done-step'
import { type useAddSourceModal } from '../hooks/use-add-source-modal'
import { createConnection } from '@/app/(originator)/sources/actions'

type Props = {
  modal: ReturnType<typeof useAddSourceModal>
  onConnected: (connectionId: string) => void
}

export function AddSourceModal({ modal, onConnected }: Props) {
  const { state, openPicker, openWithConnector, close, dispatchSetup } = modal
  const [bridgeOpen, setBridgeOpen] = useState(false)

  const def =
    state.setup.step !== 'idle' ? connectorById(state.setup.connectorId) : null

  function handleClose() {
    // Confirm only if dirty Auth state
    if (
      state.setup.step === 'auth' &&
      Object.keys(state.setup.authPayload).length > 0
    ) {
      if (!confirm('Abandon setup?')) return
    }
    setBridgeOpen(false)
    close()
  }

  async function submitSelect() {
    if (state.setup.step !== 'confirm') return
    const { connectorId, authPayload, selectedIds } = state.setup
    dispatchSetup({ type: 'submitSelect' })
    const result = await createConnection({
      connectorId,
      name: def?.name ?? connectorId,
      authPayload,
      datasetIds: selectedIds,
    })
    if (result.ok && result.data) {
      dispatchSetup({ type: 'saveSuccess', connectionId: result.data.id })
      toast.success('Connected')
    } else if (!result.ok) {
      dispatchSetup({ type: 'saveFailure', error: result.error })
      toast.error(result.error)
    }
  }

  const visibleStep =
    state.setup.step === 'idle'
      ? 'picker'
      : state.setup.step === 'submitting'
        ? 'confirm'
        : state.setup.step === 'error'
          ? 'confirm'
          : state.setup.step

  const blockBackdropDismiss = ['auth', 'discover', 'confirm', 'submitting'].includes(
    state.setup.step,
  )

  return (
    <Dialog
      open={state.open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[540px] max-w-[92vw] gap-0 overflow-hidden p-0 sm:max-w-[540px] border-v2-border bg-v2-surface"
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          if (bridgeOpen) { setBridgeOpen(false); return }
          handleClose()
        }}
        onPointerDownOutside={(e) => {
          if (blockBackdropDismiss) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">{def?.name ?? 'Add a source'}</DialogTitle>
        <>
          {state.setup.step !== 'idle' && (
            <>
              <Stepbar
                current={
                  visibleStep as
                    | 'auth'
                    | 'trust'
                    | 'discover'
                    | 'confirm'
                    | 'done'
                    | 'picker'
                }
              />
              <div className="flex items-center gap-3 pt-7 px-6 pb-4">
                <div className="flex flex-1 items-center gap-3">
                  {def?.logo.kind === 'wordmark' ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-10 items-center justify-center rounded-md font-mono text-[13px] font-semibold',
                        WORDMARK_TONES[def.logo.tone],
                      )}
                    >
                      {def.logo.label}
                    </span>
                  ) : def?.logo.kind === 'icon' ? (
                    <span className="flex size-10 items-center justify-center rounded-md bg-v2-surface-2">
                      <def.logo.Icon
                        className="size-5 text-v2-muted"
                        strokeWidth={1.75}
                      />
                    </span>
                  ) : null}
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-v2-foreground">
                      {def?.name ?? 'Add a source'}
                    </h2>
                    <p className="mt-0.5 text-[12px] text-v2-muted">
                      {def?.tagline ?? 'Pick a provider below'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="flex size-7 items-center justify-center rounded-full text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground transition-colors duration-150"
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}

          {state.setup.step === 'idle' && (
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-v2-muted/70">Add a source</span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="flex size-7 items-center justify-center rounded-full text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground transition-colors duration-150"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <div className="px-6 py-5">
            {state.setup.step === 'idle' && (
              <PickerView onPick={openWithConnector} />
            )}

            {bridgeOpen && state.setup.step === 'auth' && (
              <HyveBridge
                connectorId={state.setup.connectorId}
                onDeny={() => setBridgeOpen(false)}
                onApprove={(accountId) => {
                  setBridgeOpen(false)
                  dispatchSetup({ type: 'updateAuth', patch: { accountId } })
                  dispatchSetup({ type: 'submitAuth' })
                }}
              />
            )}

            {!bridgeOpen && state.setup.step === 'auth' && (
              <AuthStep
                connectorId={state.setup.connectorId}
                values={state.setup.authPayload}
                onUpdate={(patch) =>
                  dispatchSetup({ type: 'updateAuth', patch })
                }
                onSubmit={() => dispatchSetup({ type: 'submitAuth' })}
                onCancel={handleClose}
                onOAuthRequest={() => setBridgeOpen(true)}
              />
            )}

            {state.setup.step === 'trust' && (
              <TrustStep
                connectorId={state.setup.connectorId}
                onCancel={handleClose}
                onContinue={() => dispatchSetup({ type: 'submitTrust' })}
              />
            )}

            {state.setup.step === 'discover' && (
              <DiscoverStep
                connectorId={state.setup.connectorId}
                onComplete={(discovered) =>
                  dispatchSetup({ type: 'discoveryComplete', discovered })
                }
                onCancel={handleClose}
              />
            )}

            {(state.setup.step === 'confirm' ||
              state.setup.step === 'submitting') && (
              <ConfirmStep
                connectorId={state.setup.connectorId}
                discovered={state.setup.discovered}
                selectedIds={state.setup.selectedIds}
                onToggle={(id) =>
                  dispatchSetup({ type: 'toggleDataset', id })
                }
                onToggleAll={() => {
                  if (state.setup.step !== 'confirm') return
                  const allSelected =
                    state.setup.selectedIds.length ===
                    state.setup.discovered.length
                  for (const d of state.setup.discovered) {
                    const present = state.setup.selectedIds.includes(d.id)
                    if (allSelected === present) {
                      dispatchSetup({ type: 'toggleDataset', id: d.id })
                    }
                  }
                }}
                onConfirm={submitSelect}
                onCancel={handleClose}
                submitting={state.setup.step === 'submitting'}
              />
            )}

            {state.setup.step === 'done' && (
              <DoneStep
                connectorId={state.setup.connectorId}
                datasetCount={state.setup.datasetCount}
                onGoToConnection={() => {
                  if (state.setup.step !== 'done') return
                  onConnected(state.setup.connectionId)
                  close()
                }}
                onAddAnother={() => {
                  setBridgeOpen(false)
                  openPicker()
                }}
                onDismiss={() => {
                  if (state.setup.step !== 'done') return
                  onConnected(state.setup.connectionId)
                  close()
                }}
              />
            )}

            {state.setup.step === 'error' && (
              <div className="flex flex-col gap-3">
                <p className="text-[12.5px] text-[oklch(0.55_0.18_25)]">
                  {state.setup.error}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchSetup({ type: 'retry' })}
                    className="rounded-md bg-v2-green px-3 py-1.5 text-[12px] font-medium text-white hover:bg-v2-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      </DialogContent>
    </Dialog>
  )
}
