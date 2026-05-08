import { describe, it, expect, vi } from 'vitest'
import { subscribe, publish } from '@/lib/api/realtime'

describe('realtime', () => {
  it('delivers a published event to subscribers', async () => {
    const handler = vi.fn()
    const unsub = subscribe('test.topic', handler)
    publish('test.topic', { value: 1 })
    expect(handler).toHaveBeenCalledWith({ value: 1 })
    unsub()
  })

  it('does not deliver after unsubscribe', () => {
    const handler = vi.fn()
    const unsub = subscribe('test.topic', handler)
    unsub()
    publish('test.topic', { value: 2 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('isolates topics', () => {
    const a = vi.fn()
    const b = vi.fn()
    subscribe('topic.a', a)
    subscribe('topic.b', b)
    publish('topic.a', 1)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
  })
})
