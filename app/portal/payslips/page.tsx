import Link from 'next/link'
import { ChevronRight, FileText } from 'lucide-react'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDateRange, formatMoney } from '@/lib/format'
import { groupPayments } from '@/lib/payroll/payments'
import PageHeader from '@/components/shell/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

export default async function PortalPayslipsPage() {
  const { contractor } = await requirePortalContractor()

  const runs = await prisma.payrollRun.findMany({
    where: { status: 'FINALIZED', lineItems: { some: { contractorId: contractor.id } } },
    orderBy: { finalizedAt: 'desc' },
    include: {
      payrollPeriod: true,
      lineItems: {
        where: { contractorId: contractor.id },
        select: { contractorId: true, totalAmountPhp: true, paidAt: true },
      },
    },
  })

  return (
    <div>
      <PageHeader title="Payslips" description="A record of every payment." />

      {runs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payslips yet"
          description="Your payslip will appear here once a payroll run is finalized."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {runs.map((run) => {
            const [payment] = groupPayments(run.lineItems)

            return (
              <li key={run.id}>
                <Link
                  href={`/portal/payslips/${run.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold tabular-nums">{formatMoney('PHP', payment.phpTotal)}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {formatDateRange(run.payrollPeriod.startDate, run.payrollPeriod.endDate)}
                    </div>
                  </div>
                  <StatusBadge
                    status={payment.isPaid ? 'PAID' : 'UNPAID'}
                    label={payment.isPaid ? 'Paid' : 'Not paid yet'}
                  />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
