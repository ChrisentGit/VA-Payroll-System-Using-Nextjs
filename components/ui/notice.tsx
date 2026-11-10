import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  error: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800' },
  warning: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-900' },
  success: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  info: { icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-900' },
}

export function Notice({
  tone,
  title,
  className,
  children,
}: {
  tone: keyof typeof TONES
  title?: string
  className?: string
  children: React.ReactNode
}) {
  const { icon: Icon, className: toneClass } = TONES[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-3.5 text-sm', toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-1 font-medium">{title}</p>}
        {children}
      </div>
    </div>
  )
}
