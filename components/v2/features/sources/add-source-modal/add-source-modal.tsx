'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { PickerView } from './picker-view'
import { HyveBridge } from './hyve-bridge'
import { AuthStep } from './steps/auth-step'
import { TrustStep } from './steps/trust-step'
import { DiscoverStep } from './steps/discover-step'
import { ConfirmStep } from './steps/confirm-step'
import { DoneStep } from './steps/done-step'
import { ModalHeader } from './modal-header'
import { ModalActionBar } from './modal-action-bar'
import { connectorById } from '../catalog-data'
import { type useAddSourceModal } from '../hooks/use-add-source-modal'
import { createConnection } from '@/app/(originator)/sources/actions'

type Props = {
  modal: ReturnType<typeof useAddSourceModal>
  onConnected: (connectionId: string) => void
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

  // Derive active connector id for header
  const activeConnectorId =
    state.setup.step !== 'idle' && 'connectorId' in state.setup
      ? state.setup.connectorId
      : null

  // Account id — populated after bridge approval
  const accountId =
    state.setup.step !== 'idle' &&
    state.setup.step !== 'done'
      ? (state.setup.authPayload?.accountId as string | undefined)
      : undefined

  // The header step to show (bridge is a sub-state of auth)
  const headerStep = bridgeOpen ? 'bridge' : visibleStep

  return (
    <>
      <Dialog
        open={state.open}
        onOpenChange={(o) => {
          if (!o) handleClose()
        }}
      >
        {/* Compose portal manually for custom overlay opacity */}
        <DialogPrimitive.Portal>
          {/* Deep scrim + blur */}
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50 dark:bg-black/65',
              'backdrop-blur-[3px]',
              'data-open:animate-in data-open:fade-in-0',
              'data-closed:animate-out data-closed:fade-out-0',
              'duration-150',
            )}
          />

          {/* Modal content */}
          <DialogPrimitive.Content
            data-v2
            className={cn(
              'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-[680px] max-w-[92vw] max-h-[calc(100dvh-2.5rem)]',
              'flex flex-col outline-none overflow-hidden',
              // Surface
              'rounded-[16px] bg-v2-surface',
              // Border + inner highlight (creates the "elevated paper" feel)
              'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
              'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:dark:via-white/[0.08] before:pointer-events-none before:z-10',
              // Shadow — layered, soft, asymmetric
              'shadow-[0_1px_3px_rgba(0,0,0,0.06),_0_8px_24px_-8px_rgba(0,0,0,0.12),_0_32px_64px_-16px_rgba(0,0,0,0.18),_0_64px_128px_-32px_rgba(0,0,0,0.14)]',
              'dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),_0_8px_24px_-4px_rgba(0,0,0,0.5),_0_32px_64px_-16px_rgba(0,0,0,0.6),_0_64px_128px_-32px_rgba(0,0,0,0.5)]',
              // Entrance animation
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'duration-150',
            )}
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

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-lg text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>

            {/* ── UNIFIED HEADER (all non-idle steps) ── */}
            {state.setup.step !== 'idle' && (
              <ModalHeader
                step={headerStep}
                connectorId={activeConnectorId}
                accountId={accountId}
                isDone={state.setup.step === 'done'}
              />
            )}

            {/* ── PICKER (idle step) ── */}
            {state.setup.step === 'idle' && (
              <>
                {/* Hero header — quiet eyebrow + serif title + supporting line */}
                <div className="relative px-8 pt-8 pb-6 shrink-0">
                  {/* Soft decorative dot-grid patch in top-right corner */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 right-0 h-32 w-44 bg-dot-fine mask-radial-tr opacity-60"
                  />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2">
                      <span className="size-1 rounded-full bg-v2-green" />
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-v2-muted/75">
                        New source
                      </span>
                    </div>
                    <h2 className="mt-3 font-serif text-[32px] font-normal leading-[1.04] tracking-[-0.018em] text-v2-foreground">
                      Connect a source
                    </h2>
                    <p className="mt-2 max-w-[44ch] text-[13.5px] leading-[1.55] text-v2-muted">
                      Pick where Hyve should read from. We&rsquo;ll handle the
                      schema, the cadence, and the audit trail.
                    </p>
                  </div>
                </div>
                <div className="px-8 pb-7 overflow-y-auto flex-1 min-h-0">
                  <PickerView onPick={openWithConnector} />
                </div>
              </>
            )}

            {/* ── ANIMATED STEP CONTENT ── */}
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
                    {/* Bridge */}
                    {bridgeOpen && state.setup.step === 'auth' && (
                      <HyveBridge
                        connectorId={state.setup.connectorId}
                        onDeny={() => setBridgeOpen(false)}
                        onApprove={(acctId) => {
                          setBridgeOpen(false)
                          dispatchSetup({ type: 'updateAuth', patch: { accountId: acctId } })
                          dispatchSetup({ type: 'submitAuth' })
                        }}
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
                      />
                    )}

                    {/* Trust step */}
                    {state.setup.step === 'trust' && (
                      <TrustStep
                        connectorId={state.setup.connectorId}
                        accountId={accountId}
                        onCancel={handleClose}
                        onContinue={() => dispatchSetup({ type: 'submitTrust' })}
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
                        <div className="px-7 pt-7 pb-6 flex-1">
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
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
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
