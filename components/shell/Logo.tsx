import { cn } from '@/lib/utils'

export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={onDark ? '#ffffff' : '#1d4ed8'} />
        <path
          d="M20.5 6.8a10 10 0 1 0 4.7 15.1A8.2 8.2 0 0 1 20.5 6.8Z"
          fill={onDark ? '#1d4ed8' : '#ffffff'}
        />
      </svg>
      <span className="text-[15px] leading-none font-semibold tracking-tight">
        Bluemoso <span className="font-normal opacity-75">Payroll</span>
      </span>
    </span>
  )
}
