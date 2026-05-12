export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto grid gap-6 animate-pulse">
      <div className="h-12 w-64 rounded-md bg-foreground/10" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-md bg-foreground/5" />
        <div className="h-48 rounded-md bg-foreground/5" />
      </div>
      <div className="h-40 rounded-md bg-foreground/5" />
    </div>
  )
}
