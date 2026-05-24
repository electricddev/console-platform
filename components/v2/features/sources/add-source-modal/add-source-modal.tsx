'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { PickerView } from './picker-view'
import { HyveBridge } from './hyve-bridge'
import { AuthStep } from './steps/auth-step'
import { TrustStep } from './steps/trust-step'
import { DiscoverStep } from './steps/discover-step'
import { ConfirmStep } from './steps/confirm-step'
import { DoneStep } from './steps/done-step'
import { ProviderAccentStrip } from './provider-accent-strip'
import { ModalActionBar } from './modal-action-bar'
import { connectorById } from '../catalog-data'
import { type useAddSourceModal } from '../hooks/use-add-source-modal'
import { createConnection } from '@/app/(originator)/sources/actions'

type Props = {
  modal: ReturnType<typeof useAddSourceModal>
  onConnected: (connectionId: string) => void
}

// Step number indicators
function stepIndicator(step: string, bridgeOpen: boolean): string | undefined {
  if (step === 'idle') return undefined
  if (step === 'auth' && bridgeOpen) return '01 / 04'
  if (step === 'auth') return '01 / 04'
  if (step === 'trust') return '02 / 04'
  if (step === 'discover') return '03 / 04'
  if (step === 'confirm' || step === 'submitting') return '04 / 04'
  if (step === 'done') return undefined
  if (step === 'error') return undefined
  return undefined
}

export function AddSourceModal({ modal, onConnected }: Props) {
  const { state, openPicker, openWithConnector, close, dispatchSetup } = modal
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  function handleClose() {
    if (
      state.setup.step === 'auth' &&
      Object.keys(state.setup.authPayload).length > 0
    ) {
      setAbandonOpen(true)
      return
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
      name: connectorId,
      authPayload,
      datasetIds: selectedIds,
    })
    if (result.ok && result.data) {
      dispatchSetup({ type: 'saveSuccess', connectionId: result.data.id })
    } else if (!result.ok) {
      dispatchSetup({ type: 'saveFailure', error: result.error })
      toast.error(result.error)
    }
  }

  const visibleStep =
    state.setup.step === 'idle'
      ? 'idle'
      : state.setup.step === 'submitting'
        ? 'confirm'
        : state.setup.step === 'error'
          ? 'confirm'
          : state.setup.step

  // Key for the animated step — bridge gets its own key so it transitions
  const animKey = bridgeOpen ? `bridge-${state.setup.step}` : visibleStep

  const blockBackdropDismiss = ['auth', 'discover', 'confirm', 'submitting'].includes(
    state.setup.step,
  )

  // Derive active connector id for accent strip
  const activeConnectorId =
    state.setup.step !== 'idle' && 'connectorId' in state.setup
      ? state.setup.connectorId
      : null

  const indicator = stepIndicator(state.setup.step, bridgeOpen)

  // Account id — populated after bridge approval
  const accountId =
    state.setup.step !== 'idle' &&
    state.setup.step !== 'done'
      ? (state.setup.authPayload?.accountId as string | undefined)
      : undefined

  return (
    <>
      <Dialog
        open={state.open}
        onOpenChange={(o) => {
          if (!o) handleClose()
        }}
      >
        <DialogContent
          className="w-[720px] max-w-[92vw] max-h-[calc(100dvh-2rem)] gap-0 sm:max-w-[720px] overflow-hidden p-0 flex flex-col border-0 bg-white dark:bg-[#16161a] ring-1 ring-foreground/[0.08] dark:ring-white/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            if (bridgeOpen) {
              setBridgeOpen(false)
              return
            }
            handleClose()
          }}
          onPointerDownOutside={(e) => {
            if (blockBackdropDismiss) e.preventDefault()
          }}
        >
          <DialogTitle className="sr-only">
            {state.setup.step !== 'idle' && 'connectorId' in state.setup
              ? (connectorById(state.setup.connectorId)?.name ?? state.setup.connectorId)
              : 'Connect a source'}
          </DialogTitle>

          {/* ── PROVIDER ACCENT STRIP (2px, top edge) ───────────────────── */}
          {state.setup.step !== 'idle' && state.setup.step !== 'done' ? (
            <ProviderAccentStrip connectorId={activeConnectorId} />
          ) : state.setup.step === 'done' ? (
            /* Keep strip on done step for the final moment */
            <ProviderAccentStrip connectorId={activeConnectorId} />
          ) : null}

          {/* ── PICKER ──────────────────────────────────────────────────── */}
          {state.setup.step === 'idle' && (
            <>
              <div className="px-7 pt-9 pb-4">
                <h2 className="font-serif text-[26px] font-normal leading-tight tracking-[-0.01em] text-v2-foreground">
                  Connect a source
                </h2>
                <p className="mt-1 text-[13px] text-v2-muted">
                  Choose a provider to get started.
                </p>
              </div>
              <div className="mx-7 h-px bg-v2-border/60" />
              <div className="px-7 pt-4 pb-5 overflow-y-auto flex-1">
                <PickerView onPick={openWithConnector} />
              </div>
            </>
          )}

          {/* ── ANIMATED STEP CONTENT ───────────────────────────────────── */}
          {state.setup.step !== 'idle' && (
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={animKey}
                  initial={
                    shouldReduceMotion ? false : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    shouldReduceMotion ? {} : { opacity: 0, y: -6 }
                  }
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col flex-1"
                >
                  {/* Bridge (inside auth step slot) */}
                  {bridgeOpen && state.setup.step === 'auth' && (
                    <HyveBridge
                      connectorId={state.setup.connectorId}
                      onDeny={() => setBridgeOpen(false)}
                      onApprove={(acctId) => {
                        setBridgeOpen(false)
                        dispatchSetup({ type: 'updateAuth', patch: { accountId: acctId } })
                        dispatchSetup({ type: 'submitAuth' })
                      }}
                      stepIndicator={indicator}
                    />
                  )}

                  {/* Auth step */}
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
                      stepIndicator={indicator}
                    />
                  )}

                  {/* Trust step */}
                  {state.setup.step === 'trust' && (
                    <TrustStep
                      connectorId={state.setup.connectorId}
                      accountId={accountId}
                      onCancel={handleClose}
                      onContinue={() => dispatchSetup({ type: 'submitTrust' })}
                      stepIndicator={indicator}
                    />
                  )}

                  {/* Discover step */}
                  {state.setup.step === 'discover' && (
                    <DiscoverStep
                      connectorId={state.setup.connectorId}
                      onComplete={(discovered) =>
                        dispatchSetup({ type: 'discoveryComplete', discovered })
                      }
                      onCancel={handleClose}
                      stepIndicator={indicator}
                    />
                  )}

                  {/* Confirm step */}
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
                      stepIndicator={indicator}
                    />
                  )}

                  {/* Done step */}
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

                  {/* Error state */}
                  {state.setup.step === 'error' && (
                    <>
                      <div className="px-7 pt-9 pb-6 flex-1">
                        <p className="text-[13px] text-destructive">{state.setup.error}</p>
                      </div>
                      <ModalActionBar
                        left={<Button variant="link" size="sm" onClick={handleClose}>Cancel</Button>}
                        right={<Button variant="brand" size="sm" onClick={() => dispatchSetup({ type: 'retry' })}>Try again</Button>}
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Abandon confirmation */}
      <AlertDialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved credentials will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAbandonOpen(false)
                setBridgeOpen(false)
                close()
              }}
            >
              Abandon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
