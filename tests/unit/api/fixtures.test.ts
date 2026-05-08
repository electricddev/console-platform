import { describe, it, expect } from 'vitest'
import { fixtures } from '@/lib/api/fixtures'
import {
  OrgSchema,
  UserSchema,
  NotificationSchema,
  NetworkHealthSchema,
  DatasetSchema,
  SchemaSchema,
  TemplateSchema,
  RunSchema,
  AIInsightSchema,
} from '@/lib/api/schemas'

describe('fixtures', () => {
  it('orgs round-trip through OrgSchema', () => {
    fixtures.orgs.forEach((o) => OrgSchema.parse(o))
    expect(fixtures.orgs.length).toBeGreaterThan(0)
  })

  it('users round-trip through UserSchema', () => {
    fixtures.users.forEach((u) => UserSchema.parse(u))
    // Three demo personas: counterparty, originator, dual-role admin
    expect(fixtures.users.length).toBeGreaterThanOrEqual(3)
  })

  it('every user references an existing org', () => {
    const orgIds = new Set(fixtures.orgs.map((o) => o.id))
    fixtures.users.forEach((u) => {
      expect(orgIds.has(u.orgId)).toBe(true)
    })
  })

  it('notifications round-trip', () => {
    fixtures.notifications.forEach((n) => NotificationSchema.parse(n))
  })

  it('network health round-trips', () => {
    NetworkHealthSchema.parse(fixtures.networkHealth)
  })
})

describe('feature fixtures round-trip', () => {
  it('datasets', () => {
    fixtures.datasets.forEach((d) => DatasetSchema.parse(d))
    expect(fixtures.datasets.length).toBeGreaterThan(0)
  })
  it('schemas', () => {
    fixtures.schemas.forEach((s) => SchemaSchema.parse(s))
  })
  it('every dataset has a referenced schema', () => {
    const ids = new Set(fixtures.schemas.map((s) => s.id))
    fixtures.datasets.forEach((d) => {
      expect(ids.has(d.schemaId)).toBe(true)
    })
  })
})

describe('templates/runs/insights round-trip', () => {
  it('templates', () => fixtures.templates.forEach((t) => TemplateSchema.parse(t)))
  it('runs', () => fixtures.runs.forEach((r) => RunSchema.parse(r)))
  it('insights', () => fixtures.insights.forEach((i) => AIInsightSchema.parse(i)))
  it('every run references an existing template + dataset', () => {
    const tIds = new Set(fixtures.templates.map((t) => t.id))
    const dIds = new Set(fixtures.datasets.map((d) => d.id))
    fixtures.runs.forEach((r) => {
      expect(tIds.has(r.templateId)).toBe(true)
      expect(dIds.has(r.datasetId)).toBe(true)
    })
  })
})

import { SourceSchema, ApprovalRequestSchema, AccessGrantSchema } from '@/lib/api/schemas'
describe('originator fixtures round-trip', () => {
  it('sources', () => fixtures.sources.forEach((s) => SourceSchema.parse(s)))
  it('approvals', () => fixtures.approvals.forEach((a) => ApprovalRequestSchema.parse(a)))
  it('access grants', () => fixtures.accessGrants.forEach((g) => AccessGrantSchema.parse(g)))
})
