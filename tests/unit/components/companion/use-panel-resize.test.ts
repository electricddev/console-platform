import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelResize } from '@/components/v2/features/cp/companion/use-panel-resize'

describe('usePanelResize', () => {
  beforeEach(() => {
    sessionStorage.clear()
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
  })

  it('returns the initial height when no storage value exists', () => {
    const { result } = renderHook(() => usePanelResize({ initial: 320, min: 40, maxRatio: 0.75 }))
    expect(result.current.height).toBe(320)
  })

  it('clamps height to [min, viewportHeight * maxRatio]', () => {
    const { result } = renderHook(() => usePanelResize({ initial: 320, min: 40, maxRatio: 0.75 }))
    act(() => result.current.setHeight(20))
    expect(result.current.height).toBe(40)
    act(() => result.current.setHeight(9999))
    expect(result.current.height).toBe(600)
  })

  it('persists height to sessionStorage', () => {
    const { result } = renderHook(() =>
      usePanelResize({ initial: 320, min: 40, maxRatio: 0.75, storageKey: 'k' }),
    )
    act(() => result.current.setHeight(500))
    expect(sessionStorage.getItem('k')).toBe('500')
  })

  it('reads persisted height on init', () => {
    sessionStorage.setItem('k', '420')
    const { result } = renderHook(() =>
      usePanelResize({ initial: 320, min: 40, maxRatio: 0.75, storageKey: 'k' }),
    )
    expect(result.current.height).toBe(420)
  })
})
