import { useCallback, useEffect, useRef, useState } from 'react'

export type UsePanelResizeOpts = {
  initial: number
  min: number
  maxRatio: number
  storageKey?: string
}

export type UsePanelResizeResult = {
  height: number
  setHeight: (h: number) => void
  startDrag: (e: React.PointerEvent<HTMLElement>) => void
  isDragging: boolean
}

function clamp(h: number, min: number, max: number): number {
  if (h < min) return min
  if (h > max) return max
  return h
}

export function usePanelResize({
  initial,
  min,
  maxRatio,
  storageKey,
}: UsePanelResizeOpts): UsePanelResizeResult {
  const [height, setHeightRaw] = useState<number>(() => {
    if (typeof window === 'undefined' || !storageKey) return initial
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!Number.isNaN(n)) return n
    }
    return initial
  })

  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number | null>(null)

  const setHeight = useCallback(
    (h: number) => {
      if (typeof window === 'undefined') return
      const max = window.innerHeight * maxRatio
      const next = clamp(h, min, max)
      setHeightRaw(next)
      if (storageKey) sessionStorage.setItem(storageKey, String(next))
    },
    [min, maxRatio, storageKey],
  )

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      setIsDragging(true)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          setHeight(window.innerHeight - ev.clientY)
        })
      }
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId)
        setIsDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [setHeight],
  )

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { height, setHeight, startDrag, isDragging }
}
