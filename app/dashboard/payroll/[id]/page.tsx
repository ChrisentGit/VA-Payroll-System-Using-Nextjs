import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatDateRange, formatMoment } from '@/lib/format'
import { payFrequencyLabel } from '@/lib/labels'
import GenerateRunButton from '@/components/payroll/GenerateRunButton'
import PageHeader from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PayrollPeriodPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id } = await params
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { runs: { orderBy: { generatedAt: 'desc' } } },
  })

  if (!period) notFound()

  return (
    <div>
      <PageHeader
        title={formatDateRange(period.startDate, period.endDate)}
        description={`Pay schedule: ${payFrequencyLabel(period.frequency)}`}
        back={{ href: '/dashboard/payroll', label: 'Payroll' }}
      />

      {period.runs.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No run generated yet"
          description="Generating a draft gathers approved timesheets, retainers and completed milestones for this period."
          action={<GenerateRunButton periodId={period.id} />}
        />
      ) : (
        <ul className="space-y-3">
          {period.runs.map((run) => (
            <li
              key={run.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <StatusBadge status={run.status} />
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Generated {formatMoment(run.generatedAt)}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/payroll/runs/${run.id}`}>View run</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
