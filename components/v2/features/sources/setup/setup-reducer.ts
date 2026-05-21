export type DiscoveredDataset = { id: string; name: string; subtitle?: string; rowCount?: number; rowUnit?: string }

export type SetupState =
  | { step: 'idle' }
  | { step: 'auth'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'discovering'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'select'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'submitting'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'done'; connectorId: string; connectionId: string }
  | { step: 'error'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[]; error: string }

export type SetupAction =
  | { type: 'start'; connectorId: string }
  | { type: 'updateAuth'; patch: Record<string, unknown> }
  | { type: 'submitAuth' }
  | { type: 'discoveryComplete'; discovered: DiscoveredDataset[] }
  | { type: 'toggleDataset'; id: string }
  | { type: 'submitSelect' }
  | { type: 'saveSuccess'; connectionId: string }
  | { type: 'saveFailure'; error: string }
  | { type: 'retry' }
  | { type: 'reset' }

export const initialSetup: SetupState = { step: 'idle' }

export function setupReducer(state: SetupState, action: SetupAction): SetupState {
  switch (action.type) {
    case 'reset':
      return initialSetup
    case 'start':
      return { step: 'auth', connectorId: action.connectorId, authPayload: {} }
    case 'updateAuth':
      if (state.step !== 'auth') return state
      return { ...state, authPayload: { ...state.authPayload, ...action.patch } }
    case 'submitAuth':
      if (state.step !== 'auth') return state
      return { step: 'discovering', connectorId: state.connectorId, authPayload: state.authPayload, discovered: [], selectedIds: [] }
    case 'discoveryComplete':
      if (state.step !== 'discovering') return state
      return { step: 'select', connectorId: state.connectorId, authPayload: state.authPayload, discovered: action.discovered, selectedIds: action.discovered.map((d) => d.id) }
    case 'toggleDataset':
      if (state.step !== 'select') return state
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    case 'submitSelect':
      if (state.step !== 'select') return state
      return { step: 'submitting', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds }
    case 'saveSuccess':
      if (state.step !== 'submitting') return state
      return { step: 'done', connectorId: state.connectorId, connectionId: action.connectionId }
    case 'saveFailure':
      if (state.step !== 'submitting') return state
      return { step: 'error', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds, error: action.error }
    case 'retry':
      if (state.step !== 'error') return state
      return { step: 'auth', connectorId: state.connectorId, authPayload: state.authPayload }
  }
}
