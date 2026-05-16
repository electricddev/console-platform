'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { paletteRgbList } from './lib/palette'

const DOT_SPACING = 20
const DOT_RADIUS = 1
const CURSOR_RADIUS = 150
const PULL_STRENGTH = 5
const LERP_SPEED = 0.1

const RIPPLE_SPEED = 280
const RIPPLE_WIDTH = 120
const RIPPLE_MAX_RADIUS = 1200

const IDLE_TIMEOUT = 8_000
const IDLE_FADE_IN = 1_500
const IDLE_FADE_OUT = 2_000

const SNAKE_COUNT = 3
const SNAKE_SPEED = 5
const SNAKE_START_LENGTH = 4
const SNAKE_MAX_LENGTH = 50
const SNAKE_GROW_AMOUNT = 4
const SNAKE_GLOW_RADIUS = 2
const SNAKE_WANDER_CHANCE = 0.04

const FOOD_COUNT = 6
const FOOD_PULSE_SPEED = 3

const WALL_PADDING = 1
const WALL_MIN_SIZE = 20
const WALL_RESCAN_INTERVAL = 2_000
const BFS_MAX_DEPTH = 60

interface Ripple {
  x: number
  y: number
  radius: number
  birth: number
}
type Dir = 0 | 1 | 2 | 3
const DIR_DX = [1, 0, -1, 0]
const DIR_DY = [0, 1, 0, -1]
interface TrailSegment {
  col: number
  row: number
  colorRgb: string
}
interface Snake {
  trail: TrailSegment[]
  dir: Dir
  progress: number
  maxLength: number
  path: Dir[]
  targetFood: number
  headColor: string
  lastEatenColor: string | null
}
interface Food {
  col: number
  row: number
  birth: number
  colorRgb: string
}

function randomDir(): Dir {
  return Math.floor(Math.random() * 4) as Dir
}

function spawnSnake(cols: number, rows: number, walls: Set<number>, colorRgb: string): Snake {
  let col: number = 0,
    row: number = 0,
    attempts = 0
  do {
    col = Math.floor(Math.random() * cols)
    row = Math.floor(Math.random() * rows)
    attempts++
  } while (walls.has(row * 10000 + col) && attempts < 100)
  return {
    trail: [{ col, row, colorRgb }],
    dir: randomDir(),
    progress: 0,
    maxLength: SNAKE_START_LENGTH,
    path: [],
    targetFood: -1,
    headColor: colorRgb,
    lastEatenColor: null,
  }
}

function spawnFood(
  cols: number,
  rows: number,
  now: number,
  occupied: Set<number>,
  walls: Set<number>,
  colors: string[]
): Food {
  let col: number = 0,
    row: number = 0,
    key = 0,
    attempts = 0
  do {
    col = Math.floor(Math.random() * cols)
    row = Math.floor(Math.random() * rows)
    key = row * 10000 + col
    attempts++
  } while ((occupied.has(key) || walls.has(key)) && attempts < 100)
  const colorRgb = colors[Math.floor(Math.random() * colors.length)]
  return { col, row, birth: now, colorRgb }
}

function bfsPath(
  sc: number,
  sr: number,
  gc: number,
  gr: number,
  cols: number,
  rows: number,
  walls: Set<number>,
  body: Set<number>
): Dir[] {
  const sk = sr * 10000 + sc,
    gk = gr * 10000 + gc
  if (sk === gk) return []
  const vis = new Set<number>([sk])
  const q: [number, number, Dir[]][] = []
  for (let d = 0; d < 4; d++) {
    const nc = sc + DIR_DX[d],
      nr = sr + DIR_DY[d]
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
    const nk = nr * 10000 + nc
    if (walls.has(nk) || body.has(nk) || vis.has(nk)) continue
    vis.add(nk)
    if (nk === gk) return [d as Dir]
    q.push([nc, nr, [d as Dir]])
  }
  let qi = 0
  while (qi < q.length) {
    const [c, r, p] = q[qi++]
    if (p.length >= BFS_MAX_DEPTH) continue
    for (let d = 0; d < 4; d++) {
      const nc = c + DIR_DX[d],
        nr = r + DIR_DY[d]
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
      const nk = nr * 10000 + nc
      if (walls.has(nk) || body.has(nk) || vis.has(nk)) continue
      vis.add(nk)
      const np = [...p, d as Dir]
      if (nk === gk) return np
      q.push([nc, nr, np])
    }
  }
  return []
}

const SKIP_TAGS = new Set([
  'HTML',
  'BODY',
  'HEAD',
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'CANVAS',
  'BR',
  'HR',
  'TEMPLATE',
  'NOSCRIPT',
])
const LEAF_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'SPAN',
  'A',
  'LABEL',
  'IMG',
  'SVG',
  'VIDEO',
  'BUTTON',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'TABLE',
  'TR',
  'TD',
  'LI',
  'CODE',
  'PRE',
])

function scanWalls(cols: number, rows: number): Set<number> {
  const walls = new Set<number>()
  const add = (r: DOMRect) => {
    const sc = Math.max(0, Math.floor(r.left / DOT_SPACING) - WALL_PADDING),
      ec = Math.min(cols - 1, Math.ceil(r.right / DOT_SPACING) + WALL_PADDING),
      sr2 = Math.max(0, Math.floor(r.top / DOT_SPACING) - WALL_PADDING),
      er = Math.min(rows - 1, Math.ceil(r.bottom / DOT_SPACING) + WALL_PADDING)
    for (let row = sr2; row <= er; row++) for (let col = sc; col <= ec; col++) walls.add(row * 10000 + col)
  }
  try {
    const root = document.querySelector('[data-content]') || document.body
    root.querySelectorAll('*').forEach((el) => {
      if (SKIP_TAGS.has(el.tagName)) return
      const h = el as HTMLElement
      if (h.offsetParent === null && el.tagName !== 'BODY') return
      const r = h.getBoundingClientRect()
      if (
        r.width === 0 ||
        r.height === 0 ||
        r.bottom < 0 ||
        r.top > window.innerHeight ||
        r.right < 0 ||
        r.left > window.innerWidth
      )
        return
      if (r.width > window.innerWidth * 0.95 && r.height > window.innerHeight * 0.7) return
      if (LEAF_TAGS.has(el.tagName)) {
        if (r.width >= WALL_MIN_SIZE || r.height >= WALL_MIN_SIZE) add(r)
        return
      }
      const s = window.getComputedStyle(h)
      const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'
      const isSmall = r.width < 600 && r.height < 400
      if (hasBg && isSmall && (r.width >= WALL_MIN_SIZE || r.height >= WALL_MIN_SIZE)) add(r)
    })
  } catch {
    /* */
  }
  return walls
}

export function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const smoothRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef(0)
  const ripplesRef = useRef<Ripple[]>([])
  const lastTimeRef = useRef(0)
  const lastActivityRef = useRef(0)
  const snakesRef = useRef<Snake[]>([])
  const foodRef = useRef<Food[]>([])
  const wallsRef = useRef(new Set<number>())
  const lastWallScanRef = useRef(0)
  const idleInitRef = useRef(false)
  const smoothIdleRef = useRef(0)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const markActivity = useCallback(() => {
    lastActivityRef.current = performance.now()
  }, [])
  const onMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
    lastActivityRef.current = performance.now()
  }, [])
  const onLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 }
  }, [])
  const onClick = useCallback((e: MouseEvent) => {
    lastActivityRef.current = performance.now()
    ripplesRef.current.push({ x: e.clientX, y: e.clientY, radius: 0, birth: performance.now() })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    let dpr = window.devicePixelRatio || 1
    const resize = () => {
      dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    lastTimeRef.current = performance.now()
    lastActivityRef.current = performance.now()

    const dotBase = isDark ? 0.1 : 0.07
    const dotRgb = isDark ? '255,255,255' : '0,0,0'
    const cursorGlow = isDark ? 0.12 : 0.08
    const colors = paletteRgbList()

    const draw = (now: number) => {
      // Clamp dt so a paused-then-resumed tab can't produce a giant catch-up
      // frame (the inner snake step loop would otherwise run hundreds of
      // iterations synchronously).
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now
      const w = window.innerWidth,
        h = window.innerHeight,
        cols = Math.ceil(w / DOT_SPACING) + 1,
        rows = Math.ceil(h / DOT_SPACING) + 1
      const sm = smoothRef.current,
        tm = mouseRef.current
      sm.x += (tm.x - sm.x) * LERP_SPEED
      sm.y += (tm.y - sm.y) * LERP_SPEED
      const ripples = ripplesRef.current
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].radius += RIPPLE_SPEED * dt
        if (ripples[i].radius > RIPPLE_MAX_RADIUS) ripples.splice(i, 1)
      }
      const idleTime = now - lastActivityRef.current
      let targetIdle = 0
      if (idleTime > IDLE_TIMEOUT) {
        targetIdle = Math.min(1, (idleTime - IDLE_TIMEOUT) / IDLE_FADE_IN)
        targetIdle = targetIdle * targetIdle * (3 - 2 * targetIdle)
      }
      const prev = smoothIdleRef.current
      smoothIdleRef.current = targetIdle > prev ? targetIdle : Math.max(0, prev - dt / (IDLE_FADE_OUT / 1000))
      const idle = smoothIdleRef.current
      // Periodic rescan only after the initial idle-init has populated walls
      // — otherwise this fires on the same frame as the init block below and
      // scanWalls runs twice.
      if (idle > 0 && idleInitRef.current && now - lastWallScanRef.current > WALL_RESCAN_INTERVAL) {
        wallsRef.current = scanWalls(cols, rows)
        lastWallScanRef.current = now
      }
      const walls = wallsRef.current
      if (idle > 0 && !idleInitRef.current) {
        wallsRef.current = scanWalls(cols, rows)
        lastWallScanRef.current = now
        const w2 = wallsRef.current
        snakesRef.current = Array.from({ length: SNAKE_COUNT }, (_, i) =>
          spawnSnake(cols, rows, w2, colors[i % colors.length])
        )
        const occ = new Set<number>()
        foodRef.current = Array.from({ length: FOOD_COUNT }, () => {
          const f = spawnFood(cols, rows, now, occ, w2, colors)
          occ.add(f.row * 10000 + f.col)
          return f
        })
        idleInitRef.current = true
      }
      if (idle === 0 && idleInitRef.current) {
        snakesRef.current = []
        foodRef.current = []
        wallsRef.current = new Set()
        idleInitRef.current = false
      }
      const snakes = snakesRef.current,
        food = foodRef.current
      if (idle > 0) {
        const fm = new Map<number, number>()
        for (let i = 0; i < food.length; i++) fm.set(food[i].row * 10000 + food[i].col, i)
        const occ = new Set<number>()
        for (const f of food) occ.add(f.row * 10000 + f.col)
        for (const s of snakes) for (const t of s.trail) occ.add(t.row * 10000 + t.col)
        for (let si = 0; si < snakes.length; si++) {
          const s = snakes[si]
          s.progress += SNAKE_SPEED * dt
          // Cap the step count per frame so a single slow frame can't burn
          // hundreds of BFS pathfindings synchronously.
          let steps = 0
          while (s.progress >= 1 && steps < 4) {
            s.progress -= 1
            steps++
            const hd = s.trail[0]
            const bs = new Set<number>()
            for (let t = 1; t < s.trail.length; t++) bs.add(s.trail[t].row * 10000 + s.trail[t].col)
            for (let os = 0; os < snakes.length; os++) {
              if (os === si) continue
              for (const t of snakes[os].trail) bs.add(t.row * 10000 + t.col)
            }
            const vd: Dir[] = []
            for (let d = 0; d < 4; d++) {
              if ((d + 2) % 4 === s.dir && s.trail.length > 1) continue
              const nc = hd.col + DIR_DX[d],
                nr = hd.row + DIR_DY[d]
              if (
                nc < 0 ||
                nc >= cols ||
                nr < 0 ||
                nr >= rows ||
                walls.has(nr * 10000 + nc) ||
                bs.has(nr * 10000 + nc)
              )
                continue
              vd.push(d as Dir)
            }
            if (vd.length === 0) {
              for (let d = 0; d < 4; d++) {
                const nc = hd.col + DIR_DX[d],
                  nr = hd.row + DIR_DY[d]
                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows || walls.has(nr * 10000 + nc)) continue
                vd.push(d as Dir)
              }
            }
            if (vd.length === 0) {
              snakes[si] = spawnSnake(cols, rows, walls, s.headColor)
              break
            }
            let cd: Dir | null = null
            if (s.path.length > 0 && s.targetFood >= 0 && s.targetFood < food.length) {
              const nd = s.path[0]
              const nc = hd.col + DIR_DX[nd],
                nr = hd.row + DIR_DY[nd],
                nk = nr * 10000 + nc
              if (
                nc >= 0 &&
                nc < cols &&
                nr >= 0 &&
                nr < rows &&
                !walls.has(nk) &&
                !bs.has(nk) &&
                vd.includes(nd)
              ) {
                const tf = food[s.targetFood]
                if (tf && fm.has(tf.row * 10000 + tf.col)) {
                  cd = nd
                  s.path.shift()
                } else {
                  s.path = []
                  s.targetFood = -1
                }
              } else {
                s.path = []
                s.targetFood = -1
              }
            }
            if (cd === null) {
              const fd = food
                .map((f, i) => ({ i, d: Math.abs(f.col - hd.col) + Math.abs(f.row - hd.row) }))
                .sort((a, b) => a.d - b.d)
              for (let a = 0; a < Math.min(3, fd.length); a++) {
                const t = food[fd[a].i]
                const p = bfsPath(hd.col, hd.row, t.col, t.row, cols, rows, walls, bs)
                if (p.length > 0 && vd.includes(p[0])) {
                  cd = p[0]
                  s.path = p.slice(1)
                  s.targetFood = fd[a].i
                  break
                }
              }
            }
            if (cd === null) {
              cd = vd.includes(s.dir) ? s.dir : vd[Math.floor(Math.random() * vd.length)]
              if (Math.random() < SNAKE_WANDER_CHANCE && vd.length > 1)
                cd = vd[Math.floor(Math.random() * vd.length)]
            }
            s.dir = cd
            s.trail.unshift({ col: hd.col + DIR_DX[cd], row: hd.row + DIR_DY[cd], colorRgb: s.headColor })
            const nh = s.trail[0]
            const fk = nh.row * 10000 + nh.col
            const fi = fm.get(fk)
            if (fi !== undefined) {
              s.headColor = food[fi].colorRgb
              s.lastEatenColor = food[fi].colorRgb
              s.trail[0].colorRgb = food[fi].colorRgb
              s.maxLength = Math.min(SNAKE_MAX_LENGTH, s.maxLength + SNAKE_GROW_AMOUNT)
              s.path = []
              s.targetFood = -1
              fm.delete(fk)
              occ.delete(fk)
              const nf = spawnFood(cols, rows, now, occ, walls, colors)
              food[fi] = nf
              fm.set(nf.row * 10000 + nf.col, fi)
              occ.add(nf.row * 10000 + nf.col)
            }
            while (s.trail.length > s.maxLength) s.trail.pop()
          }
          // If progress overshot the per-frame cap, drop the remainder so we
          // don't accumulate a debt that explodes on the next frame.
          if (s.progress >= 1) s.progress = 0
        }
      }

      const snakeColorMap = new Map<number, { intensity: number; colorRgb: string }>()
      const snakeGlowMap = new Map<number, { intensity: number; colorRgb: string }>()
      if (idle > 0) {
        for (const s of snakes) {
          for (let t = 0; t < s.trail.length; t++) {
            const int = (1 - t / s.trail.length) * idle
            const seg = s.trail[t]
            const k = seg.row * 10000 + seg.col
            const existing = snakeColorMap.get(k)
            if (!existing || int > existing.intensity) {
              snakeColorMap.set(k, { intensity: int, colorRgb: seg.colorRgb })
            }
            for (let gy = -SNAKE_GLOW_RADIUS; gy <= SNAKE_GLOW_RADIUS; gy++) {
              for (let gx = -SNAKE_GLOW_RADIUS; gx <= SNAKE_GLOW_RADIUS; gx++) {
                if (!gx && !gy) continue
                const nc = seg.col + gx,
                  nr = seg.row + gy
                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
                const d = Math.sqrt(gx * gx + gy * gy)
                if (d > SNAKE_GLOW_RADIUS) continue
                const g = int * (1 - d / SNAKE_GLOW_RADIUS) * 0.35
                const nk = nr * 10000 + nc
                const eg = snakeGlowMap.get(nk)
                if (!eg || g > eg.intensity) {
                  snakeGlowMap.set(nk, { intensity: g, colorRgb: seg.colorRgb })
                }
              }
            }
          }
        }
      }

      const foodColorMap = new Map<number, Food>()
      if (idle > 0) for (const f of food) foodColorMap.set(f.row * 10000 + f.col, f)

      ctx.clearRect(0, 0, w, h)
      const cr2 = CURSOR_RADIUS * CURSOR_RADIUS
      for (let row = 0; row < rows; row++) {
        const gy = row * DOT_SPACING
        for (let col = 0; col < cols; col++) {
          const gx = col * DOT_SPACING
          let dx2 = gx,
            dy2 = gy
          const ddx = gx - sm.x,
            ddy = gy - sm.y,
            ds = ddx * ddx + ddy * ddy
          let cg = 0
          if (ds < cr2 && ds > 0) {
            const d = Math.sqrt(ds),
              t = 1 - d / CURSOR_RADIUS,
              e = t * t * (3 - 2 * t)
            dx2 = gx + (ddx / d) * e * PULL_STRENGTH
            dy2 = gy + (ddy / d) * e * PULL_STRENGTH
            cg = e
          }
          let ri = 0
          for (const r of ripples) {
            const rx = gx - r.x,
              ry = gy - r.y,
              dr = Math.abs(Math.sqrt(rx * rx + ry * ry) - r.radius)
            if (dr < RIPPLE_WIDTH) {
              const rt = 1 - dr / RIPPLE_WIDTH
              ri = Math.max(ri, rt * rt * (3 - 2 * rt) * (1 - r.radius / RIPPLE_MAX_RADIUS) ** 2)
            }
          }

          const k = row * 10000 + col
          const sc = snakeColorMap.get(k)
          const sg = snakeGlowMap.get(k)
          const fc = foodColorMap.get(k)

          const si = sc ? sc.intensity : sg ? sg.intensity : 0
          const snakeColor = sc ? sc.colorRgb : sg ? sg.colorRgb : null
          let fint = 0
          if (fc) fint = (0.7 + 0.3 * Math.sin((now - fc.birth) * 0.001 * FOOD_PULSE_SPEED * Math.PI * 2)) * idle

          const rad = DOT_RADIUS + cg * 0.2 + ri * 0.15 + si * 0.5 + fint * 0.7

          const baseOp = dotBase + cg * cursorGlow + ri * 0.08
          ctx.fillStyle = `rgba(${dotRgb},${baseOp})`
          ctx.beginPath()
          ctx.arc(dx2, dy2, rad, 0, Math.PI * 2)
          ctx.fill()

          if (snakeColor && si > 0) {
            ctx.fillStyle = `rgba(${snakeColor},${si * 0.5})`
            ctx.beginPath()
            ctx.arc(dx2, dy2, rad, 0, Math.PI * 2)
            ctx.fill()
          }

          if (fc && fint > 0) {
            ctx.fillStyle = `rgba(${fc.colorRgb},${fint * 0.6})`
            ctx.beginPath()
            ctx.arc(dx2, dy2, rad, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    // When the tab becomes visible again, browsers resume rAF but our
    // lastTime/lastActivity refs are stale. Reset both so the first frame
    // computes a sane dt and idleTime, avoiding a multi-second catch-up.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const t = performance.now()
        lastTimeRef.current = t
        lastActivityRef.current = t
      }
    }
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('resize', resize)
    window.addEventListener('keydown', markActivity)
    window.addEventListener('scroll', markActivity, true)
    window.addEventListener('touchstart', markActivity)
    document.addEventListener('visibilitychange', onVisibilityChange)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', markActivity)
      window.removeEventListener('scroll', markActivity, true)
      window.removeEventListener('touchstart', markActivity)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelAnimationFrame(rafRef.current)
    }
  }, [onMove, onLeave, onClick, markActivity, isDark])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
}
