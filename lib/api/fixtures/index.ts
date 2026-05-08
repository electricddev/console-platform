import { orgFixtures } from './orgs'
import { userFixtures, DEMO_PERSONA_IDS } from './users'
import { notificationFixtures } from './notifications'
import { networkHealthFixture } from './network'
import { datasetFixtures } from './datasets'
import { schemaFixtures } from './schemas-fx'
import { templateFixtures } from './templates'
import { runFixtures } from './runs'
import { insightFixtures } from './insights'
import { sourceFixtures } from './sources'
import { ingestionFixtures } from './ingestion'
import { approvalFixtures } from './approvals'
import { accessFixtures } from './access'
import { auditFixtures } from './audit'

export const fixtures = {
  orgs: orgFixtures,
  users: userFixtures,
  notifications: notificationFixtures,
  networkHealth: networkHealthFixture,
  datasets: datasetFixtures,
  schemas: schemaFixtures,
  templates: templateFixtures,
  runs: runFixtures,
  insights: insightFixtures,
  sources: sourceFixtures,
  ingestionEvents: ingestionFixtures,
  approvals: approvalFixtures,
  accessGrants: accessFixtures,
  audit: auditFixtures,
} as const

export { DEMO_PERSONA_IDS }
