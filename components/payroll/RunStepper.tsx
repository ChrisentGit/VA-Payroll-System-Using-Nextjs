import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shows how far a payroll run has come. The current step is the first one not done.
export default function RunStepper({ steps }: { steps: { label: string; done: boolean }[] }) {
  const currentIndex = steps.findIndex((step) => !step.done)

  return (
    <ol className="mb-6 grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-4 print:hidden">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex

        return (
          <li
            key={step.label}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-center gap-2.5 text-sm"
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                step.done && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-secondary text-primary ring-2 ring-primary',
                !step.done && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {step.done ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={cn(step.done || isCurrent ? 'font-medium' : 'text-muted-foreground')}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
