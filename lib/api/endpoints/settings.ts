import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import {
  MemberSchema,
  WalletSchema,
  ApiKeySchema,
  WebhookSchema,
  InvoiceSchema,
  ActiveSessionSchema,
} from '@/lib/api/schemas'
import type { Member, Wallet, ApiKey, Webhook, Invoice, ActiveSession } from '@/lib/api/types'

const memberState: Member[] = fixtures.members.map((m) => ({ ...m }))
const walletState: Wallet[] = fixtures.wallets.map((w) => ({ ...w }))
const apiKeyState: ApiKey[] = fixtures.apiKeys.map((k) => ({ ...k }))
const webhookState: Webhook[] = fixtures.webhooks.map((w) => ({ ...w }))
const sessionState: ActiveSession[] = fixtures.sessions.map((s) => ({ ...s }))

const orgState: { name: string; description: string; websiteUrl?: string } = {
  name: 'Gauntlet',
  description: 'Risk modeling and curation for on-chain credit.',
  websiteUrl: 'https://gauntlet.xyz',
}

const securityState = {
  ssoProvider: 'none' as 'none' | 'okta' | 'azure-ad' | 'google',
  ipAllowlist: [] as string[],
}

export const settings = {
  // org
  getOrg: mockEndpoint(async () => orgState, { latencyMs: 80 }),
  updateOrg: mockEndpoint(
    async (_ctx: RequestContext, _signal, input: Partial<typeof orgState>) => {
      Object.assign(orgState, input)
      return orgState
    },
    { latencyMs: 200 }
  ),

  // members
  listMembers: mockEndpoint(
    async (): Promise<Member[]> => memberState.map((m) => MemberSchema.parse(m)),
    { latencyMs: 100 }
  ),
  inviteMember: mockEndpoint(
    async (
      _ctx: RequestContext,
      _signal,
      input: { name: string; email: string; role: Member['role'] }
    ): Promise<Member> => {
      const m: Member = {
        id: 'mb_' + Math.random().toString(36).slice(2, 8),
        userId: 'usr_pending',
        ...input,
        invitedAt: new Date().toISOString(),
      }
      memberState.push(m)
      return MemberSchema.parse(m)
    },
    { latencyMs: 220 }
  ),
  removeMember: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      const i = memberState.findIndex((m) => m.id === id)
      if (i < 0) throw new MockApiError('Member not found', 404)
      memberState.splice(i, 1)
      return { ok: true as const }
    },
    { latencyMs: 160 }
  ),

  // wallets
  listWallets: mockEndpoint(
    async (): Promise<Wallet[]> => walletState.map((w) => WalletSchema.parse(w)),
    { latencyMs: 100 }
  ),
  addWallet: mockEndpoint(
    async (
      _ctx: RequestContext,
      _signal,
      input: { label: string; address: string; kind: Wallet['kind'] }
    ): Promise<Wallet> => {
      const w: Wallet = {
        id: 'w_' + Math.random().toString(36).slice(2, 8),
        ...input,
        isPrimary: false,
        addedAt: new Date().toISOString(),
      }
      walletState.push(w)
      return WalletSchema.parse(w)
    },
    { latencyMs: 220 }
  ),
  removeWallet: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      const i = walletState.findIndex((w) => w.id === id)
      if (i < 0) throw new MockApiError('Wallet not found', 404)
      walletState.splice(i, 1)
      return { ok: true as const }
    },
    { latencyMs: 160 }
  ),
  setPrimaryWallet: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      walletState.forEach((w) => {
        w.isPrimary = w.id === id
      })
      return { ok: true as const }
    },
    { latencyMs: 120 }
  ),

  // api keys
  listApiKeys: mockEndpoint(
    async (): Promise<ApiKey[]> => apiKeyState.map((k) => ApiKeySchema.parse(k)),
    { latencyMs: 100 }
  ),
  createApiKey: mockEndpoint(
    async (
      _ctx: RequestContext,
      _signal,
      input: { label: string; scopes: ApiKey['scopes'] }
    ): Promise<ApiKey & { secret: string }> => {
      const id = 'ak_' + Math.random().toString(36).slice(2, 8)
      const k: ApiKey = {
        id,
        label: input.label,
        prefix: 'hyve_pk_live_',
        scopes: input.scopes,
        createdAt: new Date().toISOString(),
      }
      apiKeyState.push(k)
      const secret =
        'hyve_sk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      return { ...ApiKeySchema.parse(k), secret }
    },
    { latencyMs: 240 }
  ),
  revokeApiKey: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      const i = apiKeyState.findIndex((k) => k.id === id)
      if (i < 0) throw new MockApiError('Key not found', 404)
      apiKeyState.splice(i, 1)
      return { ok: true as const }
    },
    { latencyMs: 160 }
  ),

  // webhooks
  listWebhooks: mockEndpoint(
    async (): Promise<Webhook[]> => webhookState.map((w) => WebhookSchema.parse(w)),
    { latencyMs: 100 }
  ),
  createWebhook: mockEndpoint(
    async (
      _ctx: RequestContext,
      _signal,
      input: { url: string; events: Webhook['events'] }
    ): Promise<Webhook> => {
      const w: Webhook = {
        id: 'wh_' + Math.random().toString(36).slice(2, 8),
        url: input.url,
        events: input.events,
        active: true,
        createdAt: new Date().toISOString(),
        failureCount: 0,
      }
      webhookState.push(w)
      return WebhookSchema.parse(w)
    },
    { latencyMs: 220 }
  ),
  toggleWebhook: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      const w = webhookState.find((x) => x.id === id)
      if (!w) throw new MockApiError('Webhook not found', 404)
      w.active = !w.active
      return { ok: true as const }
    },
    { latencyMs: 120 }
  ),

  // billing
  listInvoices: mockEndpoint(
    async (): Promise<Invoice[]> => fixtures.invoices.map((i) => InvoiceSchema.parse(i)),
    { latencyMs: 120 }
  ),

  // security
  getSecurity: mockEndpoint(async () => ({ ...securityState }), { latencyMs: 100 }),
  updateSecurity: mockEndpoint(
    async (_ctx: RequestContext, _signal, input: Partial<typeof securityState>) => {
      Object.assign(securityState, input)
      return { ...securityState }
    },
    { latencyMs: 220 }
  ),
  listActiveSessions: mockEndpoint(
    async (): Promise<ActiveSession[]> =>
      sessionState.map((s) => ActiveSessionSchema.parse(s)),
    { latencyMs: 100 }
  ),
  revokeSession: mockEndpoint(
    async (_ctx: RequestContext, _signal, id: string) => {
      const i = sessionState.findIndex((s) => s.id === id)
      if (i < 0) throw new MockApiError('Session not found', 404)
      sessionState.splice(i, 1)
      return { ok: true as const }
    },
    { latencyMs: 160 }
  ),
}
