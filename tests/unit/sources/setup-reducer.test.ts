import { describe, expect, it } from 'vitest'
import { setupReducer, initialSetup, type SetupState } from '@/components/v2/features/sources/add-source-modal/setup-reducer'

describe('setupReducer', () => {
  it('starts at idle', () => {
    expect(initialSetup.step).toBe('idle')
  })

  it("'start' moves to auth with the connectorId", () => {
    const s = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    expect(s.step).toBe('auth')
    if (s.step !== 'auth') throw new Error('unreachable')
    expect(s.connectorId).toBe('s3')
    expect(s.authPayload).toEqual({})
  })

  it("'updateAuth' merges fields into authPayload while in auth step", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
    const c = setupReducer(b, { type: 'updateAuth', patch: { region: 'us-east-1' } })
    if (c.step !== 'auth') throw new Error('unreachable')
    expect(c.authPayload).toEqual({ bucket: 'acme', region: 'us-east-1' })
  })

  it("'submitAuth' moves to trust (not discover)", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
    const c = setupReducer(b, { type: 'submitAuth' })
    expect(c.step).toBe('trust')
  })

  it("'submitTrust' moves from trust to discover", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
    const c = setupReducer(b, { type: 'submitAuth' })            // → trust
    const d = setupReducer(c, { type: 'submitTrust' })
    expect(d.step).toBe('discover')
  })

  it("'discoveryComplete' from discover moves to confirm", () => {
    const a: SetupState = {
      step: 'discover',
      connectorId: 's3',
      authPayload: { bucket: 'acme' },
      discovered: [],
      selectedIds: [],
    }
    const b = setupReducer(a, {
      type: 'discoveryComplete',
      discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    })
    expect(b.step).toBe('confirm')
  })

  it("'discoveryComplete' moves to confirm with discovered datasets all selected", () => {
    const a: SetupState = { step: 'discover', connectorId: 's3', authPayload: { bucket: 'acme' }, discovered: [], selectedIds: [] }
    const b = setupReducer(a, { type: 'discoveryComplete', discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] })
    expect(b.step).toBe('confirm')
    if (b.step !== 'confirm') throw new Error('unreachable')
    expect(b.discovered).toHaveLength(2)
    expect(b.selectedIds).toEqual(['a', 'b'])
  })

  it("'toggleDataset' adds or removes a discovered id", () => {
    const a: SetupState = { step: 'confirm', connectorId: 's3', authPayload: {}, discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], selectedIds: ['a', 'b'] }
    const b = setupReducer(a, { type: 'toggleDataset', id: 'a' })
    if (b.step !== 'confirm') throw new Error('unreachable')
    expect(b.selectedIds).toEqual(['b'])
    const c = setupReducer(b, { type: 'toggleDataset', id: 'a' })
    if (c.step !== 'confirm') throw new Error('unreachable')
    expect(c.selectedIds).toEqual(['b', 'a'])
  })

  it("'reset' returns to idle", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'reset' })
    expect(b.step).toBe('idle')
  })

  it("'saveFailure' moves to error and stores the message", () => {
    const a: SetupState = { step: 'submitting', connectorId: 's3', authPayload: {}, discovered: [], selectedIds: [] }
    const b = setupReducer(a, { type: 'saveFailure', error: 'boom' })
    expect(b.step).toBe('error')
    if (b.step !== 'error') throw new Error('unreachable')
    expect(b.error).toBe('boom')
  })

  it("'retry' from error returns to auth keeping the payload", () => {
    const a: SetupState = { step: 'error', connectorId: 's3', authPayload: { bucket: 'acme' }, discovered: [], selectedIds: [], error: 'boom' }
    const b = setupReducer(a, { type: 'retry' })
    expect(b.step).toBe('auth')
    if (b.step !== 'auth') throw new Error('unreachable')
    expect(b.authPayload).toEqual({ bucket: 'acme' })
  })
})
