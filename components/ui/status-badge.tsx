import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
}

// Every status in the app, so the same word always has the same color
const STATUSES: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  active: { label: 'Active', tone: 'success' },
  ON_LEAVE: { label: 'On leave', tone: 'warning' },
  paused: { label: 'Paused', tone: 'warning' },
  OFFBOARDED: { label: 'Offboarded', tone: 'neutral' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  ended: { label: 'Ended', tone: 'neutral' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  FINALIZED: { label: 'Finalized', tone: 'info' },
  PAID: { label: 'Paid', tone: 'success' },
  UNPAID: { label: 'Unpaid', tone: 'warning' },
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { label: defaultLabel, tone } = STATUSES[status] ?? { label: status, tone: 'neutral' as Tone }

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONE_CLASSES[tone]
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} aria-hidden />
      {label ?? defaultLabel}
    </span>
  )
}
