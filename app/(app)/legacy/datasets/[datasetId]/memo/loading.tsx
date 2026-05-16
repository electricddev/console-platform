export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="h-10 w-48 rounded-md bg-foreground/10" />
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-lg bg-foreground/5" />)}
    </div>
  )
}
