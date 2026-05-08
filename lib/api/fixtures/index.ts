import { orgFixtures } from './orgs'
import { userFixtures, DEMO_PERSONA_IDS } from './users'
import { notificationFixtures } from './notifications'
import { networkHealthFixture } from './network'

export const fixtures = {
  orgs: orgFixtures,
  users: userFixtures,
  notifications: notificationFixtures,
  networkHealth: networkHealthFixture,
} as const

export { DEMO_PERSONA_IDS }
