/**
 * Mock real-time. Production swap-in: replace publish/subscribe with a
 * WebSocket client backed by topic routing. Handler signatures stay identical.
 */
type Handler<T> = (payload: T) => void
type Topic = string

const subscribers = new Map<Topic, Set<Handler<unknown>>>()

export function subscribe<T>(topic: Topic, handler: Handler<T>): () => void {
  let bucket = subscribers.get(topic)
  if (!bucket) {
    bucket = new Set()
    subscribers.set(topic, bucket)
  }
  bucket.add(handler as Handler<unknown>)
  return () => {
    bucket!.delete(handler as Handler<unknown>)
    if (bucket!.size === 0) subscribers.delete(topic)
  }
}

export function publish<T>(topic: Topic, payload: T): void {
  const bucket = subscribers.get(topic)
  if (!bucket) return
  bucket.forEach((h) => {
    try {
      h(payload)
    } catch (err) {
      // Don't let one bad handler poison the bus.
      console.error('[realtime] handler threw for topic', topic, err)
    }
  })
}

/** Topic constants — keep usage typed and grep-able. */
export const Topics = {
  RUNS_PROGRESS: 'runs.progress',
  INGESTION_COMPLETENESS: 'ingestion.completeness',
  NOTIFICATIONS: 'notifications',
  NETWORK_HEALTH: 'network.health',
} as const
