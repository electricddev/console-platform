import { z } from 'zod'

// ---------- Identity ----------

export const RoleSchema = z.enum(['counterparty', 'originator', 'admin'])
export type Role = z.infer<typeof RoleSchema>

export const AssetClassSchema = z.enum([
  'private-credit',
  'trade-receivables',
  'flow-credit',
  't-bills',
  'multi-asset',
])
export type AssetClass = z.infer<typeof AssetClassSchema>

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  assetClasses: z.array(AssetClassSchema).default([]),
  verified: z.boolean().default(false),
})
export type Org = z.infer<typeof OrgSchema>

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  orgId: z.string(),
  signingKey: z.string(), // 0x-prefixed hex public key
  lastLoginAt: z.string().datetime(),
  avatarUrl: z.string().url().optional(),
})
export type User = z.infer<typeof UserSchema>

// ---------- Attestation (the load-bearing trust primitive) ----------

export const AttestationSchema = z.object({
  teeMeasurement: z.string(), // hex
  codeHash: z.string(), // hex
  outputSignature: z.string(), // hex
  anchorTxHash: z.string().optional(),
  anchorBlockNumber: z.number().int().nonnegative().optional(),
  anchorChain: z.enum(['ethereum', 'base', 'optimism']).optional(),
  anchoredAt: z.string().datetime().optional(),
})
export type Attestation = z.infer<typeof AttestationSchema>

// ---------- Notifications ----------

export const NotificationKindSchema = z.enum([
  'attestation-published',
  'approval-requested',
  'approval-decided',
  'completeness-alert',
  'schema-changed',
  'access-granted',
  'access-revoked',
  'run-completed',
  'run-failed',
  'anomaly-detected',
])
export type NotificationKind = z.infer<typeof NotificationKindSchema>

export const SeveritySchema = z.enum(['info', 'warning', 'critical'])
export type Severity = z.infer<typeof SeveritySchema>

export const NotificationSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
  kind: NotificationKindSchema,
  title: z.string(),
  body: z.string(),
  severity: SeveritySchema,
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  href: z.string().optional(),
})
export type Notification = z.infer<typeof NotificationSchema>

// ---------- Network status (used by topbar) ----------

export const NetworkHealthSchema = z.object({
  teeStatus: z.enum(['healthy', 'degraded', 'down']),
  anchorStatus: z.enum(['healthy', 'lagging', 'down']),
  anchorLatencyMs: z.number().int().nonnegative(),
  ingestionStatus: z.enum(['healthy', 'lagging', 'down']),
  updatedAt: z.string().datetime(),
})
export type NetworkHealth = z.infer<typeof NetworkHealthSchema>

// ---------- AI Insight (used on home + dataset detail) ----------

export const AIInsightSchema = z.object({
  id: z.string(),
  generatedAt: z.string().datetime(),
  claim: z.string(),
  evidenceRunIds: z.array(z.string()).min(1, 'AI claims must cite at least one run'),
  severity: SeveritySchema,
  suggestedAction: z
    .object({ label: z.string(), href: z.string() })
    .optional(),
})
export type AIInsight = z.infer<typeof AIInsightSchema>

// ---------- Workspace switcher item ----------

export const WorkspaceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  role: RoleSchema,
})
export type Workspace = z.infer<typeof WorkspaceSchema>

// ---------- Brief primitives (used by the ACRED monitoring brief) ----------

export const DeltaToneSchema = z.enum(['positive', 'negative', 'neutral'])
export type DeltaTone = z.infer<typeof DeltaToneSchema>

export const DeltaSchema = z.object({
  value: z.number(),
  delta: z.number(),
  // pp = percentage points; pct = fractional change (0.05 = 5%); abs = raw units.
  deltaKind: z.enum(['pp', 'pct', 'abs']),
  tone: DeltaToneSchema,
})
export type Delta = z.infer<typeof DeltaSchema>

export const BriefSnapshotSchema = z.object({
  periodEnd: z.string().datetime(),
  priorPeriodEnd: z.string().datetime(),
  vitals: z.object({
    nav: DeltaSchema,
    leverage: DeltaSchema,
    nonAccrualPct: DeltaSchema,
    top10ConcentrationPct: DeltaSchema,
    pikPct: DeltaSchema,
    netFlow: DeltaSchema,
  }),
})
export type BriefSnapshot = z.infer<typeof BriefSnapshotSchema>

export const RedFlagSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  drillHref: z.string().nullable(),
})
export type RedFlag = z.infer<typeof RedFlagSchema>

export const AnomalyEventSchema = z.object({
  id: z.string(),
  occurredAt: z.string().datetime(),
  kind: z.enum(['credit-event', 'filing', 'attestation-gap', 'amm-sla']),
  severity: z.enum(['info', 'low', 'medium', 'high']),
  title: z.string(),
  borrowerNormalized: z.string().nullable(),
  detailHref: z.string().nullable(),
})
export type AnomalyEvent = z.infer<typeof AnomalyEventSchema>

// ---------- Datasets ----------

export const DatasetStatusSchema = z.enum(['active', 'paused', 'archived'])

export const FieldExposureSchema = z.enum(['queryable', 'aggregated-only', 'private'])

export const FieldTypeSchema = z.enum(['string', 'number', 'date', 'currency', 'enum', 'bool'])

export const SchemaFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  exposure: FieldExposureSchema,
  description: z.string().optional(),
  isPii: z.boolean().default(false),
  minBucketSize: z.number().int().nonnegative().optional(),
  allowedOperators: z.array(z.enum(['sum', 'avg', 'count', 'min', 'max'])).optional(),
  sample: z.string().optional(),
})
export type SchemaField = z.infer<typeof SchemaFieldSchema>

export const SchemaSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  version: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  fields: z.array(SchemaFieldSchema),
  policy: z.object({
    kAnonymity: z.number().int().nonnegative(),
    maxQueriesPerCounterpartyPerDay: z.number().int().nonnegative(),
    allowedTimeRanges: z.array(z.string()).optional(),
  }),
  signedBy: z.string(),
  signedAt: z.string().datetime(),
  changeSummary: z.string().optional(),
})
export type Schema = z.infer<typeof SchemaSchema>

export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  originatorOrgId: z.string(),
  assetClass: AssetClassSchema,
  geography: z.string().optional(),
  schemaId: z.string(),
  schemaVersion: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
  lastAttestedAt: z.string().datetime(),
  completenessPct: z.number().min(0).max(1),
  status: DatasetStatusSchema,
  templateCount: z.number().int().nonnegative(),
  lifetimeRunCount: z.number().int().nonnegative(),
  attestation: AttestationSchema,
  watching: z.boolean().default(false),
  alerts: z.array(z.object({
    id: z.string(),
    severity: SeveritySchema,
    title: z.string(),
    body: z.string(),
    createdAt: z.string().datetime(),
  })).default([]),
  tables: z.array(z.object({ id: z.string() })).optional(),
  briefSnapshot: BriefSnapshotSchema.optional(),
})
export type Dataset = z.infer<typeof DatasetSchema>

// ---------- Templates ----------

export const TemplateApprovalStateSchema = z.enum([
  'unsubmitted',
  'pending',
  'approved',
  'denied',
  'changes-requested',
])

export const ParamTypeSchema = z.enum(['number', 'string', 'date', 'enum', 'bool', 'duration'])

export const TemplateParameterSchema = z.object({
  name: z.string(),
  type: ParamTypeSchema,
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  enumValues: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})
export type TemplateParameter = z.infer<typeof TemplateParameterSchema>

export const OutputSchemaSchema = z.object({
  shape: z.enum(['scalar', 'tabular', 'time-series', 'distribution']),
  columns: z.array(z.object({
    name: z.string(),
    type: FieldTypeSchema,
  })).optional(),
})
export type OutputSchema = z.infer<typeof OutputSchemaSchema>

export const TemplateApprovalSchema = z.object({
  datasetId: z.string(),
  state: TemplateApprovalStateSchema,
  approvedAt: z.string().datetime().optional(),
  approverId: z.string().optional(),
  signature: z.string().optional(),
  constraints: z.array(z.object({
    paramName: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    minBucketSize: z.number().int().optional(),
  })).optional(),
  rationale: z.string().optional(),
})
export type TemplateApproval = z.infer<typeof TemplateApprovalSchema>

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  authorId: z.string(),
  authorOrgId: z.string(),
  versionId: z.string(),
  versionNumber: z.number().int().nonnegative(),
  lastModifiedAt: z.string().datetime(),
  parameters: z.array(TemplateParameterSchema),
  outputSchema: OutputSchemaSchema,
  dsl: z.string(),
  approvals: z.array(TemplateApprovalSchema),
  tags: z.array(z.string()).default([]),
  compatibleAssetClasses: z.array(AssetClassSchema).default([]),
  archived: z.boolean().default(false),
  averageRuntimeMs: z.number().int().nonnegative().optional(),
  forkOfTemplateId: z.string().optional(),
})
export type Template = z.infer<typeof TemplateSchema>

// ---------- Runs ----------

export const RunStatusSchema = z.enum([
  'queued',
  'running',
  'attesting',
  'anchoring',
  'completed',
  'failed',
  'disputed',
])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const RunResultSchema = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('scalar'),
    value: z.union([z.number(), z.string(), z.boolean()]),
    unit: z.string().optional(),
  }),
  z.object({
    shape: z.literal('tabular'),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.number(), z.string(), z.null()]))),
  }),
  z.object({
    shape: z.literal('time-series'),
    metric: z.string(),
    series: z.array(z.object({
      name: z.string(),
      points: z.array(z.object({ t: z.string().datetime(), v: z.number() })),
    })),
  }),
  z.object({
    shape: z.literal('distribution'),
    bins: z.array(z.object({ label: z.string(), value: z.number() })),
  }),
])
export type RunResult = z.infer<typeof RunResultSchema>

export const RunSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateVersionId: z.string(),
  datasetId: z.string(),
  schemaVersionAtRun: z.number().int().nonnegative(),
  runnerId: z.string(),
  runnerOrgId: z.string(),
  parameters: z.record(z.unknown()),
  status: RunStatusSchema,
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  result: RunResultSchema.optional(),
  attestation: AttestationSchema.optional(),
  error: z.string().optional(),
  disputeReason: z.string().optional(),
})
export type Run = z.infer<typeof RunSchema>

// ---------- Sources ----------

export const SourceTypeSchema = z.enum(['postgres', 'mysql', 'snowflake', 'bigquery', 's3', 'rest-api', 'custom'])
export type SourceType = z.infer<typeof SourceTypeSchema>

export const SourceStatusSchema = z.enum(['healthy', 'lagging', 'paused', 'down'])
export type SourceStatus = z.infer<typeof SourceStatusSchema>

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SourceTypeSchema,
  ownerOrgId: z.string(),
  recordsProcessed: z.number().int().nonnegative(),
  lastCommitAt: z.string().datetime(),
  lagSeconds: z.number().nonnegative(),
  completenessPct: z.number().min(0).max(1),
  status: SourceStatusSchema,
  agentVersion: z.string(),
  agentInstalledAt: z.string().datetime(),
})
export type Source = z.infer<typeof SourceSchema>

export const IngestionEventSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  timestamp: z.string().datetime(),
  recordCount: z.number().int().nonnegative(),
  commitHash: z.string(),
  outcome: z.enum(['committed', 'partial', 'failed']),
  error: z.string().optional(),
})
export type IngestionEvent = z.infer<typeof IngestionEventSchema>

// ---------- Approvals ----------

export const ApprovalRequestStateSchema = z.enum(['pending', 'approved', 'denied', 'changes-requested'])

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateVersionId: z.string(),
  datasetId: z.string(),
  requesterId: z.string(),
  requesterOrgId: z.string(),
  requestedAt: z.string().datetime(),
  state: ApprovalRequestStateSchema,
  decidedAt: z.string().datetime().optional(),
  decidedBy: z.string().optional(),
  signature: z.string().optional(),
  rationale: z.string().optional(),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
})
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>

// ---------- Access ----------

export const PermissionLevelSchema = z.enum(['none', 'read', 'execute'])
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>

export const AccessGrantSchema = z.object({
  id: z.string(),
  counterpartyOrgId: z.string(),
  datasetId: z.string(),
  level: PermissionLevelSchema,
  rateLimitPerDay: z.number().int().nonnegative(),
  allowedTemplateIds: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  grantedAt: z.string().datetime(),
  grantedBy: z.string(),
})
export type AccessGrant = z.infer<typeof AccessGrantSchema>

// ---------- Audit ----------

export const AuditActionSchema = z.enum([
  'approved-template',
  'denied-template',
  'requested-changes',
  'submitted-template',
  'executed-query',
  'published-result',
  'disputed-run',
  'published-schema',
  'updated-schema',
  'granted-access',
  'revoked-access',
  'connected-source',
  'paused-source',
  'resumed-source',
])
export type AuditAction = z.infer<typeof AuditActionSchema>

export const AuditResourceTypeSchema = z.enum([
  'dataset', 'template', 'run', 'schema', 'source', 'access-grant', 'approval',
])
export type AuditResourceType = z.infer<typeof AuditResourceTypeSchema>

export const AuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string(),
  actorOrgId: z.string(),
  signingKey: z.string(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: z.string(),
  hash: z.string(),                          // entry-level hash
  merkleProof: z.array(z.string()).optional(),
  anchorTxHash: z.string().optional(),
  anchorBlockNumber: z.number().int().nonnegative().optional(),
  context: z.record(z.unknown()).optional(),
})
export type AuditEntry = z.infer<typeof AuditEntrySchema>

// ---------- Settings ----------

export const MemberRoleSchema = z.enum(['admin', 'editor', 'analyst', 'viewer', 'approver'])

export const MemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: MemberRoleSchema,
  invitedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
})
export type Member = z.infer<typeof MemberSchema>

export const WalletSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),                       // 0x...
  kind: z.enum(['hot', 'hardware', 'multisig']),
  isPrimary: z.boolean(),
  addedAt: z.string().datetime(),
})
export type Wallet = z.infer<typeof WalletSchema>

export const ApiKeyScopeSchema = z.enum(['read', 'execute', 'admin'])

export const ApiKeySchema = z.object({
  id: z.string(),
  label: z.string(),
  prefix: z.string(),                        // visible prefix; secret is never returned
  scopes: z.array(ApiKeyScopeSchema),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
})
export type ApiKey = z.infer<typeof ApiKeySchema>

export const WebhookSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  events: z.array(z.enum(['run.completed', 'attestation.published', 'schema.changed', 'access.granted', 'access.revoked'])),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  failureCount: z.number().int().nonnegative(),
})
export type Webhook = z.infer<typeof WebhookSchema>

export const NotificationChannelSchema = z.enum(['email', 'in-app', 'webhook'])
export const NotificationPrefSchema = z.object({
  kind: z.string(),                          // notification kind
  channels: z.array(NotificationChannelSchema),
})
export type NotificationPref = z.infer<typeof NotificationPrefSchema>

export const InvoiceSchema = z.object({
  id: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  amountUsd: z.number(),
  status: z.enum(['paid', 'open', 'void']),
  url: z.string().url().optional(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const ActiveSessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  ip: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  current: z.boolean(),
})
export type ActiveSession = z.infer<typeof ActiveSessionSchema>

// ---------- Notebooks ----------

export const NotebookCellSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('markdown'), markdown: z.string() }),
  z.object({
    id: z.string(),
    kind: z.literal('query'),
    templateId: z.string().optional(),
    dsl: z.string(),
    parameters: z.record(z.unknown()).default({}),
    runId: z.string().optional(),
    methodologyId: z.string().optional(),
    renderShape: z.enum(['metric', 'comparison', 'time-series', 'breakdown', 'table']).optional(),
  }),
  z.object({ id: z.string(), kind: z.literal('visualization'), runId: z.string(), shape: z.enum(['bar', 'line', 'distribution']) }),
  z.object({ id: z.string(), kind: z.literal('attestation'), runIds: z.array(z.string()).min(1) }),
])
export type NotebookCell = z.infer<typeof NotebookCellSchema>

export const NotebookSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  authorId: z.string(),
  authorOrgId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  cells: z.array(NotebookCellSchema),
  shareToken: z.string().optional(),
})
export type Notebook = z.infer<typeof NotebookSchema>

// ---------- Copilot ----------

export const CopilotMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string(),
  createdAt: z.string().datetime(),
  evidenceRunIds: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
  toolCalls: z.array(z.object({
    kind: z.enum(['execute-template', 'list-datasets', 'compile-template']),
    input: z.unknown(),
    output: z.unknown().optional(),
  })).default([]),
})
export type CopilotMessage = z.infer<typeof CopilotMessageSchema>

export const CopilotThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(CopilotMessageSchema),
})
export type CopilotThread = z.infer<typeof CopilotThreadSchema>

// ---------- Status ----------

export const StatusReportSchema = z.object({
  overall: z.enum(['operational', 'degraded', 'outage']),
  components: z.array(z.object({
    name: z.string(),
    status: z.enum(['operational', 'degraded', 'outage']),
    message: z.string().optional(),
  })),
  updatedAt: z.string().datetime(),
})
export type StatusReport = z.infer<typeof StatusReportSchema>
