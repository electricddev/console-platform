import { describe, it, expect } from 'vitest'
import { ai } from '@/lib/api/endpoints/ai'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('AI mock contract', () => {
  it('summarizeRun produces a citation-bearing string', async () => {
    const out = await ai.summarizeRun(ctx, 'run_demo')
    expect(out.text).toContain('Run #run_demo')
    expect(out.evidenceRunIds).toContain('run_demo')
  })

  it('compileTemplate streams DSL tokens for an NL prompt', async () => {
    const stream = ai.compileTemplate(ctx, {
      prompt: 'weighted average advance rate by sector',
      datasetId: 'ds_mfone',
    })
    let collected = ''
    for await (const chunk of stream) collected += chunk
    expect(collected.length).toBeGreaterThan(0)
    expect(collected).toMatch(/SELECT|aggregate|weighted/i)
  })

  it('privacyAnalysis returns a risk score and reasons', async () => {
    const r = await ai.privacyAnalysis(ctx, {
      dsl: 'SELECT advance_rate FROM loans GROUP BY sector',
      schemaId: 'sch_mfone_v3',
    })
    expect(r.riskScore).toBeGreaterThanOrEqual(0)
    expect(r.riskScore).toBeLessThanOrEqual(1)
    expect(Array.isArray(r.findings)).toBe(true)
  })

  it('suggestQueries returns three suggestions for a dataset', async () => {
    const suggestions = await ai.suggestQueries(ctx, 'ds_mfone')
    expect(suggestions).toHaveLength(3)
  })

  it('detectAnomalies returns deterministic insights for a dataset', async () => {
    const a = await ai.detectAnomalies(ctx, 'ds_mfone')
    const b = await ai.detectAnomalies(ctx, 'ds_mfone')
    expect(a).toEqual(b)
  })
})
