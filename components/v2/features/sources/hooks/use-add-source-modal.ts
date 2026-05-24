'use client'

import { useReducer, useCallback } from 'react'
import {
  setupReducer,
  type SetupState,
  type SetupAction,
} from '../add-source-modal/setup-reducer'

type ModalState = { open: boolean; setup: SetupState }

type ModalAction =
  | { type: 'openPicker' }
  | { type: 'openWithConnector'; connectorId: string }
  | { type: 'close' }
  | { type: 'setup'; action: SetupAction }

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'openPicker':
      return { open: true, setup: { step: 'idle' } }
    case 'openWithConnector':
      return {
        open: true,
        setup: setupReducer({ step: 'idle' }, { type: 'start', connectorId: action.connectorId }),
      }
    case 'close':
      return { open: false, setup: { step: 'idle' } }
    case 'setup':
      return { ...state, setup: setupReducer(state.setup, action.action) }
  }
}

export function useAddSourceModal() {
  const [state, dispatch] = useReducer(modalReducer, {
    open: false,
    setup: { step: 'idle' },
  })

  const openPicker = useCallback(() => dispatch({ type: 'openPicker' }), [])
  const openWithConnector = useCallback(
    (connectorId: string) => dispatch({ type: 'openWithConnector', connectorId }),
    [],
  )
  const close = useCallback(() => dispatch({ type: 'close' }), [])
  const dispatchSetup = useCallback(
    (action: SetupAction) => dispatch({ type: 'setup', action }),
    [],
  )

  return { state, openPicker, openWithConnector, close, dispatchSetup }
}
