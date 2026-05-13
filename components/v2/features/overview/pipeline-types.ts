/**
 * Operational pipeline data model — the live computation DAG that drives
 * the fund's NAV per share publication.
 *
 * One status per node, three states only: attested (green), pending (amber),
 * failed (red). No "warning" tier — keeps the at-a-glance read binary-ish.
 */

export type PipelineStatus = 'attested' | 'pending' | 'failed'

/** Grouping for visual columns and conceptual phase. */
export type PipelinePhase = 'source' | 'validate' | 'value' | 'aggregate' | 'publish'

export interface PipelineProvenance {
  /** Short identifier for the signing key (e.g. fingerprint suffix). */
  signingKey: string
  /** Proof type or attestation scheme. */
  proofType: 'ed25519' | 'kzg' | 'merkle-anchor' | 'tlsnotary'
  /** A truncated hash or transaction reference. */
  reference: string
}

export interface PipelineNodeIO {
  label: string
  value: string
}

export interface PipelineNodeData {
  /** Display label for the stage. */
  label: string
  /** Phase column — determines x position in the layout. */
  phase: PipelinePhase
  /** Status drives the dot color and the active border tint. */
  status: PipelineStatus
  /** Plain-text cadence label — "every 15m", "real-time", "daily 16:00 UTC". */
  cadence: string
  /** ISO timestamp of the last successful run (or last attempt for failed). */
  lastRunAt: string
  /** ISO timestamp of the next scheduled run. */
  nextRunAt: string
  /** Short paragraph used in the detail panel. */
  description: string
  /** Inputs feeding this stage. */
  inputs: PipelineNodeIO[]
  /** Output produced by this stage (single value or summary). */
  output: PipelineNodeIO
  /** Provenance chain shown in the detail panel. */
  provenance: PipelineProvenance
}

export interface PipelineNode {
  id: string
  data: PipelineNodeData
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface PipelineFixture {
  /** Top-of-screen KPI strip values. */
  kpi: {
    totalNav: string
    navPerShare: string
    sharesOutstanding: string
    /** ISO timestamp of the next publish. The page derives a live countdown. */
    nextPublishAt: string
    /** Subtext under each value — e.g. "as of 14:23 UTC". */
    asOfLabel: string
  }
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}
