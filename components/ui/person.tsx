function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)

  return letters.toUpperCase()
}

// A name with its initials, and an optional second line such as an email
export function Person({ name, detail }: { name: string; detail?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
        aria-hidden
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <div className="font-medium">{name}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  )
}
