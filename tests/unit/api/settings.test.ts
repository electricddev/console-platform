import { describe, it, expect } from 'vitest'
import { settings } from '@/lib/api/endpoints/settings'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('settings', () => {
  it('listMembers + invite + remove', async () => {
    const before = await settings.listMembers(ctx)
    const m = await settings.inviteMember(ctx, { name: 'New', email: 'new@gauntlet.xyz', role: 'analyst' })
    const after = await settings.listMembers(ctx)
    expect(after.length).toBe(before.length + 1)
    await settings.removeMember(ctx, m.id)
    const post = await settings.listMembers(ctx)
    expect(post.length).toBe(before.length)
  })
  it('createApiKey returns secret once', async () => {
    const r = await settings.createApiKey(ctx, { label: 'temp', scopes: ['read'] })
    expect(r.secret).toMatch(/^hyve_sk_/)
  })
  it('addWallet + setPrimary', async () => {
    const w = await settings.addWallet(ctx, { label: 'Test', address: '0x' + '1'.repeat(40), kind: 'hot' })
    await settings.setPrimaryWallet(ctx, w.id)
    const wallets = await settings.listWallets(ctx)
    expect(wallets.find((x) => x.id === w.id)?.isPrimary).toBe(true)
  })
})
