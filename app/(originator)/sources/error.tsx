'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-8 pt-6">
      <h1 className="text-xl font-semibold text-v2-foreground">Connections couldn't load</h1>
      <p className="mt-2 text-sm text-v2-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-v2-border px-3 py-1.5 text-sm text-v2-foreground hover:bg-v2-foreground/[0.05]"
      >
        Try again
      </button>
    </div>
  )
}
