import { orgFixtures } from './orgs'
import { userFixtures, DEMO_PERSONA_IDS } from './users'
import { notificationFixtures } from './notifications'
import { networkHealthFixture } from './network'
import { datasetFixtures } from './datasets'
import { schemaFixtures } from './schemas-fx'
import { templateFixtures } from './templates'
import { runFixtures } from './runs'
import { insightFixtures } from './insights'

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
} as const

export { DEMO_PERSONA_IDS }
