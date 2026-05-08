import type { AuditEntry } from '@/lib/api/types'

export const RESOURCE_HREF: Record<AuditEntry['resourceType'], (id: string) => string> = {
  dataset: (id) => `/datasets/${id}`,
  template: (id) => `/templates/${id}`,
  run: (id) => `/runs/${id}`,
  schema: (id) => `/schemas/${id}`,
  source: (id) => `/sources/${id}`,
  'access-grant': () => '/access',
  approval: (id) => `/approvals/${id}`,
}
