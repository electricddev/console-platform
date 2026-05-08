import type { AuditEntry } from '@/lib/api/types'
import { runFixtures } from './runs'
import { approvalFixtures } from './approvals'
import { accessFixtures } from './access'
import { sourceFixtures } from './sources'

const merkle = () => Array.from({ length: 4 }, () => '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0'))

const entries: AuditEntry[] = []

runFixtures.forEach((r) => {
  entries.push({
    id: 'au_run_q_' + r.id,
    timestamp: r.queuedAt,
    actorId: r.runnerId,
    actorOrgId: r.runnerOrgId,
    signingKey: '0x' + r.runnerId.padEnd(40, '0'),
    action: 'executed-query',
    resourceType: 'run',
    resourceId: r.id,
    hash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, 'a'),
    merkleProof: merkle(),
    anchorTxHash: r.attestation?.anchorTxHash,
    anchorBlockNumber: r.attestation?.anchorBlockNumber,
    context: { templateId: r.templateId, datasetId: r.datasetId },
  })
  if (r.attestation) {
    entries.push({
      id: 'au_run_pub_' + r.id,
      timestamp: r.completedAt ?? r.queuedAt,
      actorId: r.runnerId,
      actorOrgId: r.runnerOrgId,
      signingKey: '0x' + r.runnerId.padEnd(40, '0'),
      action: 'published-result',
      resourceType: 'run',
      resourceId: r.id,
      hash: r.attestation.outputSignature,
      merkleProof: merkle(),
      anchorTxHash: r.attestation.anchorTxHash,
      anchorBlockNumber: r.attestation.anchorBlockNumber,
    })
  }
})

approvalFixtures.forEach((a) => {
  entries.push({
    id: 'au_apv_req_' + a.id,
    timestamp: a.requestedAt,
    actorId: a.requesterId,
    actorOrgId: a.requesterOrgId,
    signingKey: '0x' + a.requesterId.padEnd(40, '0'),
    action: 'submitted-template',
    resourceType: 'approval',
    resourceId: a.id,
    hash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, 'b'),
    context: { templateId: a.templateId, datasetId: a.datasetId },
  })
  if (a.decidedAt && a.decidedBy) {
    entries.push({
      id: 'au_apv_dec_' + a.id,
      timestamp: a.decidedAt,
      actorId: a.decidedBy,
      actorOrgId: 'org_tradefin',
      signingKey: '0x' + a.decidedBy.padEnd(40, '0'),
      action: a.state === 'approved' ? 'approved-template' : a.state === 'denied' ? 'denied-template' : 'requested-changes',
      resourceType: 'approval',
      resourceId: a.id,
      hash: a.signature ?? '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, 'c'),
    })
  }
})

accessFixtures.forEach((g) => {
  entries.push({
    id: 'au_access_' + g.id,
    timestamp: g.grantedAt,
    actorId: g.grantedBy,
    actorOrgId: 'org_tradefin',
    signingKey: '0x' + g.grantedBy.padEnd(40, '0'),
    action: 'granted-access',
    resourceType: 'access-grant',
    resourceId: g.id,
    hash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, 'd'),
    context: { counterpartyOrgId: g.counterpartyOrgId, datasetId: g.datasetId, level: g.level },
  })
})

sourceFixtures.forEach((s) => {
  entries.push({
    id: 'au_src_conn_' + s.id,
    timestamp: s.agentInstalledAt,
    actorId: 'usr_tom',
    actorOrgId: s.ownerOrgId,
    signingKey: '0x' + 'tom'.padEnd(40, '0'),
    action: 'connected-source',
    resourceType: 'source',
    resourceId: s.id,
    hash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, 'e'),
    context: { type: s.type, name: s.name },
  })
})

entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

export const auditFixtures: AuditEntry[] = entries
