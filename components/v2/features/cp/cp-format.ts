/**
 * Formatting helpers shared across counterparty (cp) pages.
 * RSC-safe: pure functions, no browser APIs.
 */

import type { AnalysisStatus, ExecutionStatus } from './cp-fixtures'
import type { StatusTone } from '@/components/v2/ui/status-pill'

export function fmtRelative(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  const diff = now - t
  const abs = Math.abs(diff)
  const sign = diff >= 0 ? 'ago' : 'in'
  const mins = Math.round(abs / 60_000)
  const hrs = Math.round(abs / 3_600_000)
  const days = Math.round(abs / 86_400_000)
  if (abs < 60_000) return diff >= 0 ? 'just now' : 'imminent'
  if (mins < 60) return sign === 'ago' ? `${mins}m ago` : `in ${mins}m`
  if (hrs < 48) return sign === 'ago' ? `${hrs}h ago` : `in ${hrs}h`
  return sign === 'ago' ? `${days}d ago` : `in ${days}d`
}

export function fmtAbsolute(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(new Date(iso))
}

export function fmtLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

// ── Analysis status ───────────────────────────────────────────────────────────

export const ANALYSIS_STATUS_LABEL: Record<AnalysisStatus, string> = {
  draft:              'Draft',
  proposed:           'Proposed',
  changes_requested:  'Changes requested',
  approved_executing: 'Executing',
  denied:             'Denied',
  retired:            'Retired',
}

export const ANALYSIS_STATUS_TONE: Record<AnalysisStatus, StatusTone> = {
  draft:              'neutral',
  proposed:           'info',
  changes_requested:  'changes_requested',
  approved_executing: 'success',
  denied:             'denied',
  retired:            'neutral',
}

// ── Execution status ──────────────────────────────────────────────────────────

export const EXECUTION_STATUS_LABEL: Record<ExecutionStatus, string> = {
  success: 'Signed',
  partial: 'Partial',
  failed:  'Failed',
}

export const EXECUTION_STATUS_TONE: Record<ExecutionStatus, StatusTone> = {
  success: 'success',
  partial: 'warning',
  failed:  'danger',
}

// ── Trigger summary ───────────────────────────────────────────────────────────

export function fmtTrigger(trigger: { kind: string; expr?: string; humanized?: string; sourceLabel?: string }): string {
  if (trigger.kind === 'cron') return trigger.expr ?? ''
  if (trigger.kind === 'event') return `on: ${trigger.sourceLabel ?? ''}`
  return 'manual'
}

export function fmtTriggerHuman(trigger: { kind: string; expr?: string; humanized?: string; sourceLabel?: string }): string {
  if (trigger.kind === 'cron') return trigger.humanized ?? trigger.expr ?? ''
  if (trigger.kind === 'event') return `on "${trigger.sourceLabel ?? ''}"`
  return 'manual trigger'
}
