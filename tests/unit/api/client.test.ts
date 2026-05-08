import { describe, it, expect } from 'vitest'
import { mockEndpoint, type RequestContext } from '@/lib/api/client'

describe('mockEndpoint', () => {
  it('resolves with the handler result', async () => {
    const endpoint = mockEndpoint(async () => ({ value: 42 }))
    const result = await endpoint({} as RequestContext)
    expect(result).toEqual({ value: 42 })
  })

  it('rejects when the abort signal fires during sleep', async () => {
    const endpoint = mockEndpoint(
      async () => 'never',
      { latencyMs: 500, jitter: 0 }
    )
    const ac = new AbortController()
    setTimeout(() => ac.abort(), 50)
    await expect(
      endpoint({ signal: ac.signal } as RequestContext)
    ).rejects.toThrow()
  })

  it('forwards a deterministic seeded random when MOCK_LATENCY_MS=0', async () => {
    const endpoint = mockEndpoint(async () => 'ok', { latencyMs: 0, failureRate: 0 })
    const r = await endpoint({} as RequestContext)
    expect(r).toBe('ok')
  })

  it('surfaces a thrown error when failureRate is 1', async () => {
    const endpoint = mockEndpoint(async () => 'never', { latencyMs: 0, failureRate: 1 })
    await expect(endpoint({} as RequestContext)).rejects.toThrow(/simulated/i)
  })
})
