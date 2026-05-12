export default function Loading() {
  return (
    <div className="grid gap-3 animate-pulse">
      <div className="h-10 rounded-md bg-foreground/5" />
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-md bg-foreground/5" />)}
    </div>
  )
}
