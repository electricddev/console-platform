import type {
  Memo, AcknowledgedFlag, DismissedAnomaly, Threshold, WatchEntry,
  IssuerRequest, AlertRule, AlertChannel,
} from '@/lib/api/schemas'

const SEED_NOW = new Date('2026-05-12T08:00:00.000Z').toISOString()

const seededDraftMemo: Memo = {
  id: 'memo_acred_q1_2026',
  datasetId: 'ds_acred',
  authorId: 'u_demo_counterparty',
  status: 'draft',
  createdAt: SEED_NOW,
  updatedAt: SEED_NOW,
  sections: {
    character:  { markdown: '', inserts: [] },
    capacity:   { markdown: '', inserts: [] },
    capital:    { markdown: '', inserts: [] },
    collateral: { markdown: '', inserts: [] },
    conditions: { markdown: '', inserts: [] },
  },
  flagDecisions: [],
}

let _acks:            AcknowledgedFlag[]         = []
let _dismissals:      DismissedAnomaly[]         = []
let _thresholds:      Threshold[]                = []
let _watch:           WatchEntry[]               = []
let _issuerReqs:      IssuerRequest[]            = []
let _alertRules:      AlertRule[]                = []
let _alertChannels:   AlertChannel[]             = []
let _memos:           Memo[]                     = [seededDraftMemo]
let _lastVisitAlerts: Record<string, string>     = {}

// readers
export const getAcknowledgedFlags  = () => _acks
export const getDismissedAnomalies = () => _dismissals
export const getThresholds         = () => _thresholds
export const getWatchEntries       = () => _watch
export const getIssuerRequests     = () => _issuerReqs
export const getAlertRules         = () => _alertRules
export const getAlertChannels      = () => _alertChannels
export const getMemos              = () => _memos
export const getLastVisitAlerts    = (userId: string) => _lastVisitAlerts[userId]

// writers
export const appendAcknowledgedFlag = (x: AcknowledgedFlag) => { _acks.push(x); return x }
export const appendDismissedAnomaly = (x: DismissedAnomaly) => { _dismissals.push(x); return x }
export const appendThreshold        = (x: Threshold)        => { _thresholds.push(x); return x }
export const upsertWatchEntry       = (x: WatchEntry)       => {
  const i = _watch.findIndex((w) => w.datasetId === x.datasetId && w.userId === x.userId)
  if (i >= 0) _watch[i] = x; else _watch.push(x)
  return x
}
export const removeWatchEntry       = (datasetId: string, userId: string) => {
  _watch = _watch.filter((w) => !(w.datasetId === datasetId && w.userId === userId))
}
export const appendIssuerRequest    = (x: IssuerRequest)    => { _issuerReqs.push(x); return x }
export const appendAlertRule        = (x: AlertRule)        => { _alertRules.push(x); return x }
export const replaceAlertRule       = (id: string, patch: Partial<AlertRule>) => {
  const i = _alertRules.findIndex((r) => r.id === id)
  if (i >= 0) _alertRules[i] = { ..._alertRules[i], ...patch }
  return _alertRules[i]
}
export const removeAlertRule        = (id: string) => { _alertRules = _alertRules.filter((r) => r.id !== id) }
export const appendAlertChannel     = (x: AlertChannel)     => { _alertChannels.push(x); return x }
export const removeAlertChannel     = (id: string) => { _alertChannels = _alertChannels.filter((c) => c.id !== id) }
export const upsertMemo             = (memo: Memo) => {
  const i = _memos.findIndex((m) => m.id === memo.id)
  if (i >= 0) _memos[i] = memo; else _memos.push(memo)
  return memo
}
export const setLastVisitAlerts     = (userId: string, ts: string) => { _lastVisitAlerts[userId] = ts }

export const __resetForTests = () => {
  _acks = []; _dismissals = []; _thresholds = []; _watch = []
  _issuerReqs = []; _alertRules = []; _alertChannels = []
  _memos = [seededDraftMemo]
  _lastVisitAlerts = {}
}
