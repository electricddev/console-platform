import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  getActiveMemo, updateMemoSection, recordFlagDecision,
  submitMemo, approveMemo, requestMemoChanges,
} from '@/lib/api/endpoints/memos'

const counterpartyCtx = { user: { id: 'u_demo_counterparty', orgId: 'org_infinifi', role: 'counterparty' as const } }
const adminCtx        = { user: { id: 'u_admin',             orgId: 'org_infinifi', role: 'admin' as const } }

beforeEach(() => store.__resetForTests())

describe('memos endpoints', () => {
  it('getActiveMemo returns the seeded draft for ACRED', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(memo.status).toBe('draft')
    expect(memo.datasetId).toBe('ds_acred')
  })

  it('getActiveMemo creates a new draft for a different dataset', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_mfone')
    expect(memo.datasetId).toBe('ds_mfone')
    expect(memo.status).toBe('draft')
  })

  it('updateMemoSection writes markdown into the right section', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await updateMemoSection(counterpartyCtx, memo.id, 'character', { markdown: 'Apollo has a strong track record.', inserts: [] })
    const after = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(after.sections.character.markdown).toBe('Apollo has a strong track record.')
  })

  it('recordFlagDecision appends a flagDecisions entry', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await recordFlagDecision(counterpartyCtx, memo.id, {
      flagId: 'acred.leverage_high', action: 'acknowledge',
      note: 'IC accepts elevated leverage.',
      decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: counterpartyCtx.user.id,
    })
    const after = await getActiveMemo(counterpartyCtx, 'ds_acred')
    expect(after.flagDecisions).toHaveLength(1)
  })

  it('submitMemo transitions draft → submitted', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    const submitted = await submitMemo(counterpartyCtx, memo.id)
    expect(submitted.status).toBe('submitted')
    expect(submitted.submittedAt).toBeTruthy()
  })

  it('submitMemo rejects if memo is not in draft', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await submitMemo(counterpartyCtx, memo.id)
    await expect(submitMemo(counterpartyCtx, memo.id)).rejects.toThrow()
  })

  it('approveMemo gates on admin role + submitted status', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await expect(approveMemo(counterpartyCtx, memo.id)).rejects.toThrow()
    await submitMemo(counterpartyCtx, memo.id)
    await expect(approveMemo(counterpartyCtx, memo.id)).rejects.toThrow()
    const approved = await approveMemo(adminCtx, memo.id)
    expect(approved.status).toBe('approved')
    expect(approved.approvedBy).toBe(adminCtx.user.id)
  })

  it('requestMemoChanges flips submitted → draft', async () => {
    const memo = await getActiveMemo(counterpartyCtx, 'ds_acred')
    await submitMemo(counterpartyCtx, memo.id)
    const reverted = await requestMemoChanges(adminCtx, memo.id, 'Needs more on capacity.')
    expect(reverted.status).toBe('draft')
  })
})
