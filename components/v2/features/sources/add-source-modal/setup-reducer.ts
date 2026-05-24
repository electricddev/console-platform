export type DiscoveredDataset = { id: string; name: string; subtitle?: string; rowCount?: number; rowUnit?: string }

export type SetupState =
  | { step: 'idle' }
  | { step: 'auth'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'trust'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'discover'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'confirm'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'submitting'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'done'; connectorId: string; connectionId: string; datasetCount: number }
  | { step: 'error'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[]; error: string }

export type SetupAction =
  | { type: 'start'; connectorId: string }
  | { type: 'updateAuth'; patch: Record<string, unknown> }
  | { type: 'submitAuth' }
  | { type: 'submitTrust' }
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
      return { step: 'trust', connectorId: state.connectorId, authPayload: state.authPayload }
    case 'submitTrust':
      if (state.step !== 'trust') return state
      return { step: 'discover', connectorId: state.connectorId, authPayload: state.authPayload, discovered: [], selectedIds: [] }
    case 'discoveryComplete':
      if (state.step !== 'discover') return state
      return { step: 'confirm', connectorId: state.connectorId, authPayload: state.authPayload, discovered: action.discovered, selectedIds: action.discovered.map((d) => d.id) }
    case 'toggleDataset':
      if (state.step !== 'confirm') return state
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    case 'submitSelect':
      if (state.step !== 'confirm') return state
      return { step: 'submitting', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds }
    case 'saveSuccess':
      if (state.step !== 'submitting') return state
      return {
        step: 'done',
        connectorId: state.connectorId,
        connectionId: action.connectionId,
        datasetCount: state.selectedIds.length,
      }
    case 'saveFailure':
      if (state.step !== 'submitting') return state
      return { step: 'error', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds, error: action.error }
    case 'retry':
      if (state.step !== 'error') return state
      return { step: 'auth', connectorId: state.connectorId, authPayload: state.authPayload }
  }
}
