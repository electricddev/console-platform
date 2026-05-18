'use client'
import { useReducer, useCallback } from 'react'

export type AssertionOperator =
  | 'not_null'
  | 'unique'
  | 'range'
  | 'between'
  | 'eq'
  | 'regex'
  | 'freshness'

export type AssertionStatus = 'will-run' | 'passed' | 'failed'

export type Assertion = {
  id: string
  column: string
  operator: AssertionOperator
  value?: string
  value2?: string
  status: AssertionStatus
  failingRows?: Record<string, string>[]
  note?: string
}

type Action =
  | { type: 'add'; column: string; operator: AssertionOperator }
  | { type: 'update'; id: string; patch: Partial<Assertion> }
  | { type: 'delete'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'run-one'; id: string }
  | { type: 'run-all' }
  | { type: 'sync-columns'; existing: string[] }

function evalStatus(): AssertionStatus {
  // Mock evaluator — deterministic-ish per call.
  return Math.random() > 0.3 ? 'passed' : 'failed'
}

function reducer(state: Assertion[], action: Action): Assertion[] {
  switch (action.type) {
    case 'add': {
      const id = `${action.column}-${action.operator}-${Date.now()}`
      return [...state, { id, column: action.column, operator: action.operator, status: 'will-run' }]
    }
    case 'update':
      return state.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a))
    case 'delete':
      return state.filter((a) => a.id !== action.id)
    case 'duplicate': {
      const src = state.find((a) => a.id === action.id)
      if (!src) return state
      return [...state, { ...src, id: `${src.id}-copy-${Date.now()}`, status: 'will-run' }]
    }
    case 'run-one':
      return state.map((a) =>
        a.id === action.id ? { ...a, status: evalStatus() } : a,
      )
    case 'run-all':
      return state.map((a) => ({ ...a, status: evalStatus() }))
    case 'sync-columns':
      return state.map((a) =>
        action.existing.includes(a.column)
          ? a
          : { ...a, status: 'failed' as AssertionStatus, note: 'Column no longer exists' },
      )
  }
}

export function useAssertions(initial: Assertion[] = []) {
  const [assertions, dispatch] = useReducer(reducer, initial)
  return {
    assertions,
    add: useCallback((column: string, operator: AssertionOperator) => dispatch({ type: 'add', column, operator }), []),
    update: useCallback((id: string, patch: Partial<Assertion>) => dispatch({ type: 'update', id, patch }), []),
    remove: useCallback((id: string) => dispatch({ type: 'delete', id }), []),
    duplicate: useCallback((id: string) => dispatch({ type: 'duplicate', id }), []),
    runOne: useCallback((id: string) => dispatch({ type: 'run-one', id }), []),
    runAll: useCallback(() => dispatch({ type: 'run-all' }), []),
    syncColumns: useCallback((existing: string[]) => dispatch({ type: 'sync-columns', existing }), []),
  }
}
