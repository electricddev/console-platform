import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import type { AIInsight } from '@/lib/api/types'

// ---------- Types ----------

export type RunSummary = {
  text: string
  evidenceRunIds: string[]
  confidence: number       // 0..1
}

export type PrivacyFinding = {
  severity: 'info' | 'warning' | 'critical'
  message: string
  remediation?: string
}

export type PrivacyAnalysis = {
  riskScore: number              // 0..1
  findings: PrivacyFinding[]
  acknowledgedOverridable: boolean
}

export type CompileTemplateInput = {
  prompt: string
  datasetId: string
}

export type SuggestedQuery = {
  question: string
  templateHint?: string
}

// ---------- Helpers ----------

function* tokenize(text: string): Generator<string> {
  // 8-12 char chunks to simulate streaming.
  for (let i = 0; i < text.length; i += 10) {
    yield text.slice(i, i + 10)
  }
}

async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

// ---------- Endpoints ----------

const summarizeRun = mockEndpoint(
  async (_ctx: RequestContext, _signal, runId: string): Promise<RunSummary> => {
    return {
      text: `Run #${runId} produced a result within the expected envelope. No anomalies relative to the trailing 30-day distribution.`,
      evidenceRunIds: [runId],
      confidence: 0.92,
    }
  },
  { latencyMs: 220 }
)

function compileTemplate(
  _ctx: RequestContext,
  input: CompileTemplateInput
): AsyncIterable<string> {
  // Deterministic mock: produce a small DSL snippet derived from the prompt.
  const dsl =
    `-- compiled from: "${input.prompt}"\n` +
    `-- against dataset: ${input.datasetId}\n` +
    `SELECT\n` +
    `  weighted_avg(advance_rate, principal) AS advance_rate,\n` +
    `  sector\n` +
    `FROM loans\n` +
    `WHERE as_of_date BETWEEN :window_start AND :window_end\n` +
    `GROUP BY sector\n` +
    `HAVING bucket_size >= :min_bucket;\n`

  return {
    [Symbol.asyncIterator]: async function* () {
      for (const tok of tokenize(dsl)) {
        await delay(20)
        yield tok
      }
    },
  }
}

const privacyAnalysis = mockEndpoint(
  async (
    _ctx: RequestContext,
    _signal,
    input: { dsl: string; schemaId: string }
  ): Promise<PrivacyAnalysis> => {
    const findings: PrivacyFinding[] = []
    let risk = 0.05

    if (!/HAVING\s+bucket_size/i.test(input.dsl)) {
      findings.push({
        severity: 'warning',
        message: 'Aggregation has no minimum bucket size. Counterparties may identify groups smaller than k-anonymity.',
        remediation: 'Add `HAVING bucket_size >= 10`.',
      })
      risk += 0.4
    }
    if (/SELECT \*/.test(input.dsl)) {
      findings.push({
        severity: 'critical',
        message: 'SELECT * exposes every queryable field — broader than necessary.',
        remediation: 'Project explicit fields only.',
      })
      risk += 0.4
    }
    if (/loan_id|borrower_id|email/i.test(input.dsl)) {
      findings.push({
        severity: 'critical',
        message: 'Identifier or PII field referenced.',
        remediation: 'Aggregate or hash before exposing.',
      })
      risk += 0.5
    }

    return {
      riskScore: Math.min(1, risk),
      findings,
      acknowledgedOverridable: findings.every((f) => f.severity !== 'critical'),
    }
  },
  { latencyMs: 350 }
)

const suggestQueries = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<SuggestedQuery[]> => {
    // Deterministic per dataset.
    return [
      { question: `What is the default rate by vintage for ${datasetId}?`, templateHint: 'default_rate_by_vintage' },
      { question: `Show me concentration breaches over the last quarter on ${datasetId}.`, templateHint: 'concentration_breaches' },
      { question: `Compare advance rates across sectors on ${datasetId}.`, templateHint: 'advance_rate_by_sector' },
    ]
  },
  { latencyMs: 160 }
)

const detectAnomalies = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<AIInsight[]> => {
    // Deterministic — same inputs → same outputs.
    return [
      {
        id: `ai_${datasetId}_001`,
        generatedAt: '2026-05-08T08:30:00.000Z',
        claim: `Vintage Q3-2025 advance rate declining; concentration breach predicted within 14 days on ${datasetId}.`,
        evidenceRunIds: [`run_${datasetId}_advance_q3`],
        severity: 'warning',
        suggestedAction: { label: 'Run concentration check', href: `/datasets/${datasetId}` },
      },
    ]
  },
  { latencyMs: 180 }
)

export const ai = {
  summarizeRun,
  compileTemplate,
  privacyAnalysis,
  suggestQueries,
  detectAnomalies,
}
