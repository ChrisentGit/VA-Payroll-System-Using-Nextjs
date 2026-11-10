import { Logo } from '@/components/shell/Logo'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateRange, formatMomentDate, formatMoney } from '@/lib/format'
import { rateTypeLabel } from '@/lib/labels'
import type { PayslipData } from '@/lib/payroll/payslip'

// Stacked rows rather than a table, so it reads the same on a phone and on paper
export default function Payslip({ data }: { data: PayslipData }) {
  const { run, contractor, items, phpTotal } = data
  const paid = items.every((li) => li.paidAt !== null) ? items[0] : null

  return (
    <article className="max-w-3xl rounded-xl border bg-card p-5 shadow-xs sm:p-8 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-center justify-between gap-3 border-b pb-5">
        <Logo />
        <StatusBadge status={paid ? 'PAID' : 'UNPAID'} label={paid ? 'Paid' : 'Not paid yet'} />
      </header>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prepared for</div>
          <div className="mt-1 font-semibold">{contractor.name}</div>
          <div className="text-sm text-muted-foreground">{contractor.email}</div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pay period</div>
          <div className="mt-1 font-semibold">
            {formatDateRange(run.payrollPeriod.startDate, run.payrollPeriod.endDate)}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-secondary px-4 py-3.5">
        <div className="text-sm text-secondary-foreground">Total pay</div>
        <div className="text-2xl font-semibold tabular-nums sm:text-3xl">{formatMoney('PHP', phpTotal)}</div>
      </div>

      <ul className="mt-5 divide-y">
        {items.map((li) => (
          <li key={li.id} className="flex justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <div className="font-medium">{li.engagement.client.name}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {rateTypeLabel(li.rateType)}
                {li.hours && ` · ${li.hours} hrs at ${formatMoney(li.currency, li.rateAmount)}`}
              </div>
              {li.notes && <div className="mt-0.5 text-xs text-muted-foreground">{li.notes}</div>}
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="font-medium">
                {li.totalAmountPhp ? formatMoney('PHP', li.totalAmountPhp) : '—'}
              </div>
              {li.currency !== 'PHP' && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatMoney(li.currency, li.totalAmount)}
                  {li.exchangeRate && ` at ${li.exchangeRate.toString()}`}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {paid && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 border-t pt-5 text-sm">
          {paid.paidAt && (
            <>
              <dt className="text-muted-foreground">Paid on</dt>
              <dd className="font-medium">{formatMomentDate(paid.paidAt)}</dd>
            </>
          )}
          {paid.paidTo && (
            <>
              <dt className="text-muted-foreground">Paid to</dt>
              <dd className="font-medium">{paid.paidTo}</dd>
            </>
          )}
          {paid.paymentReference && (
            <>
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium break-all">{paid.paymentReference}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  )
}
