/**
 * Mock API client. Real Rust API swap-in: replace this file with one that
 * forwards to fetch() against process.env.RUST_API_URL. Endpoint wrappers
 * and Zod schemas stay identical.
 */

export type RequestContext = {
  signal?: AbortSignal
  user?: { id: string; orgId: string; role: 'counterparty' | 'originator' | 'admin' }
}

export type MockOptions = {
  /** Override base latency. Default reads MOCK_LATENCY_MS env or 250. */
  latencyMs?: number
  /** Probabilistic failure rate (0..1). */
  failureRate?: number
  /** Jitter range as a fraction of latencyMs. Default 0.4 (±40%). */
  jitter?: number
}

const DEFAULT_LATENCY = Number(process.env.MOCK_LATENCY_MS) || 250

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export class MockApiError extends Error {
  constructor(message: string, public readonly status: number = 500) {
    super(message)
    this.name = 'MockApiError'
  }
}

export function mockEndpoint<TArgs extends unknown[], TResult>(
  handler: (ctx: RequestContext, signal: AbortSignal | undefined, ...args: TArgs) => Promise<TResult>,
  opts: MockOptions = {}
): (ctx: RequestContext, ...args: TArgs) => Promise<TResult> {
  return async (ctx, ...args) => {
    const latency = opts.latencyMs ?? DEFAULT_LATENCY
    const jitter = opts.jitter ?? 0.4
    const failure = opts.failureRate ?? 0

    const sign = Math.random() < 0.5 ? -1 : 1
    const noise = latency * jitter * Math.random() * sign
    const delay = Math.max(0, latency + noise)

    await sleep(delay, ctx.signal)

    if (failure > 0 && Math.random() < failure) {
      throw new MockApiError('Simulated mock failure', 503)
    }

    return handler(ctx, ctx.signal, ...args)
  }
}

/**
 * Convenience wrapper for endpoints that take no extra args. Most reads
 * use this — `getCurrentUser`, `listNotifications`, etc.
 */
export function mockQuery<T>(
  handler: (ctx: RequestContext) => Promise<T> | T,
  opts: MockOptions = {}
): (ctx: RequestContext) => Promise<T> {
  return mockEndpoint(async (ctx) => handler(ctx), opts)
}
