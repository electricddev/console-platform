import { describe, it, expect } from 'vitest'
import { acredMethodology } from '@/lib/data/acred/methodology'

const SHAPES = new Set(['metric', 'comparison', 'time-series', 'breakdown', 'table'])
const AXES = new Set(['time', 'segment', 'snapshot'])
const KNOWN_VIEWS = new Set(['fund_overview', 'borrowers', 'holdings', 'concentration_metrics', 'credit_events'])

describe('acredMethodology', () => {
  it('has at least 10 entries', () => {
    expect(acredMethodology.length).toBeGreaterThanOrEqual(10)
  })

  it('every entry has required fields with valid shapes and axes', () => {
    for (const m of acredMethodology) {
      expect(m.id, 'id required').toBeTruthy()
      expect(m.title, `title required for ${m.id}`).toBeTruthy()
      expect(m.description, `description required for ${m.id}`).toBeTruthy()
      expect(SHAPES.has(m.shape), `${m.id} invalid shape: ${m.shape}`).toBe(true)
      expect(AXES.has(m.axis), `${m.id} invalid axis: ${m.axis}`).toBe(true)
      expect(m.dsl, `${m.id} missing dsl`).toBeTruthy()
    }
  })

  it('every id is unique', () => {
    const ids = new Set<string>()
    for (const m of acredMethodology) {
      expect(ids.has(m.id), `duplicate id: ${m.id}`).toBe(false)
      ids.add(m.id)
    }
  })

  it('every DSL references only known ACRED views', () => {
    // Naive scan: lowercase the DSL, search for "from <name>" tokens.
    // We do NOT execute SQL here — full validation happens in the E2E spec.
    for (const m of acredMethodology) {
      const dsl = m.dsl.toLowerCase()
      const matches = [...dsl.matchAll(/\bfrom\s+([a-z_][a-z0-9_]*)/g)]
      const referenced = new Set(matches.map((mm) => mm[1]))
      // Allow CTE names (anything declared via `WITH name AS`).
      const cteNames = new Set([...dsl.matchAll(/\bwith\s+([a-z_][a-z0-9_]*)\s+as/g)].map((mm) => mm[1]))
      const commaCtes = new Set([...dsl.matchAll(/\)\s*,\s*([a-z_][a-z0-9_]*)\s+as/g)].map((mm) => mm[1]))
      for (const name of referenced) {
        if (KNOWN_VIEWS.has(name) || cteNames.has(name) || commaCtes.has(name)) continue
        throw new Error(`${m.id} references unknown table/view: ${name}`)
      }
    }
  })
})
