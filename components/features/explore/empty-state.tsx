'use client'

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="grid h-[40vh] place-items-center gap-3 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      {action}
    </div>
  )
}
