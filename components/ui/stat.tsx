import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stat({
  label,
  value,
  icon: Icon,
  href,
  highlight = false,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  href?: string
  highlight?: boolean
}) {
  const tile = (
    <div
      className={cn(
        'flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors sm:p-5',
        href && 'hover:border-primary/40',
        highlight && 'border-amber-300 bg-amber-50/60'
      )}
    >
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-[18px]" aria-hidden />
      </span>
    </div>
  )

  return href ? (
    <Link href={href} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {tile}
    </Link>
  ) : (
    tile
  )
}
