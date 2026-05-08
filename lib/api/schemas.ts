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
