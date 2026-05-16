export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="h-6 w-48 rounded-md bg-foreground/10" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-foreground/5" />)}
      </div>
      <div className="h-32 rounded-lg bg-foreground/5" />
      <div className="h-40 rounded-lg bg-foreground/5" />
    </div>
  )
}
