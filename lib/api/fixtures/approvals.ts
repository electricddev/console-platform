import type { ApprovalRequest } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const approvalFixtures: ApprovalRequest[] = [
  {
    id: 'apv_001',
    templateId: 'tpl_advance_rate_by_sector',
    templateVersionId: 'tplv_advance_rate_v3',
    datasetId: 'ds_creditbridge',
    requesterId: 'usr_maya',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(120),
    state: 'pending',
    urgency: 'high',
  },
  {
    id: 'apv_002',
    templateId: 'tpl_default_rate_by_vintage',
    templateVersionId: 'tplv_default_rate_v2',
    datasetId: 'ds_mfone',
    requesterId: 'usr_admin',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(48 * 60),
    state: 'changes-requested',
    decidedAt: ts(40 * 60),
    decidedBy: 'usr_tom',
    rationale: 'Reduce parameter range; current lookback exposes single-deal vintages.',
    urgency: 'normal',
  },
  {
    id: 'apv_003',
    templateId: 'tpl_concentration_breaches',
    templateVersionId: 'tplv_concentration_v1',
    datasetId: 'ds_mfone',
    requesterId: 'usr_maya',
    requesterOrgId: 'org_gauntlet',
    requestedAt: ts(60 * 24 * 30),
    state: 'approved',
    decidedAt: ts(60 * 24 * 30 - 60),
    decidedBy: 'usr_tom',
    signature: '0x' + 'cc'.repeat(20),
    urgency: 'normal',
  },
]
