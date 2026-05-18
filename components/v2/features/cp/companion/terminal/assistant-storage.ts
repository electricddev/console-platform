export type AssistantProvider = 'anthropic-gateway' | 'openai' | 'openrouter'

export type AssistantConfig = {
  provider: AssistantProvider
  key: string
}

const PROVIDER_KEY = 'hyve:assistant:provider'
const KEY_PREFIX = 'hyve:assistant:key:'

export function loadConfig(): AssistantConfig | null {
  if (typeof window === 'undefined') return null
  const provider = localStorage.getItem(PROVIDER_KEY) as AssistantProvider | null
  if (provider !== 'anthropic-gateway' && provider !== 'openai' && provider !== 'openrouter') return null
  const key = localStorage.getItem(KEY_PREFIX + provider)
  if (!key) return null
  return { provider, key }
}

export function saveConfig(c: AssistantConfig): void {
  localStorage.setItem(PROVIDER_KEY, c.provider)
  localStorage.setItem(KEY_PREFIX + c.provider, c.key)
}

export function clearConfig(): void {
  const provider = localStorage.getItem(PROVIDER_KEY)
  if (provider) localStorage.removeItem(KEY_PREFIX + provider)
  localStorage.removeItem(PROVIDER_KEY)
}
