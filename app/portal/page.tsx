import Link from 'next/link'
import { CalendarClock, Hourglass, Plus } from 'lucide-react'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDateRange, formatMoney, todayInCompanyZone } from '@/lib/format'
import { firstName } from '@/lib/labels'
import { groupPayments } from '@/lib/payroll/payments'
import PayoutCard from '@/components/portal/PayoutCard'
import PageHeader from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { StatusBadge } from '@/components/ui/status-badge'

function currentMonthRange() {
  const [year, month] = todayInCompanyZone().split('-').map(Number)

  return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) }
}

export default async function PortalHomePage() {
  const { contractor } = await requirePortalContractor()

  const [hours, waiting, rejected, latestRun] = await Promise.all([
    prisma.timesheet.aggregate({
      where: {
        contractorId: contractor.id,
        date: currentMonthRange(),
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      _sum: { hours: true },
    }),
    prisma.timesheet.count({ where: { contractorId: contractor.id, status: 'SUBMITTED' } }),
    prisma.timesheet.count({ where: { contractorId: contractor.id, status: 'REJECTED' } }),
    prisma.payrollRun.findFirst({
      where: { status: 'FINALIZED', lineItems: { some: { contractorId: contractor.id } } },
      orderBy: { finalizedAt: 'desc' },
      include: {
        payrollPeriod: true,
        lineItems: {
          where: { contractorId: contractor.id },
          select: { contractorId: true, totalAmountPhp: true, paidAt: true },
        },
      },
    }),
  ])

  const latestPayment = latestRun ? groupPayments(latestRun.lineItems)[0] : null
  const canLogHours = contractor.status !== 'OFFBOARDED'

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Hi, ${firstName(contractor.name)}`}
        description="Your hours and pay at a glance."
        actions={
          canLogHours && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/portal/timesheets/new">
                <Plus aria-hidden />
                Log hours
              </Link>
            </Button>
          )
        }
      />

      {rejected > 0 && (
        <Notice tone="warning" title={rejected === 1 ? '1 timesheet was sent back' : `${rejected} timesheets were sent back`}>
          <Link href="/portal/timesheets" className="underline underline-offset-2">
            See what needs fixing
          </Link>
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Stat
          label="Hours this month"
          value={(hours._sum.hours ?? 0).toString()}
          icon={CalendarClock}
          href="/portal/timesheets"
        />
        <Stat label="Awaiting approval" value={waiting} icon={Hourglass} href="/portal/timesheets" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest pay</CardTitle>
        </CardHeader>
        <CardContent>
          {latestRun && latestPayment ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatMoney('PHP', latestPayment.phpTotal)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {formatDateRange(latestRun.payrollPeriod.startDate, latestRun.payrollPeriod.endDate)}
                </div>
                <div className="mt-2">
                  <StatusBadge
                    status={latestPayment.isPaid ? 'PAID' : 'UNPAID'}
                    label={latestPayment.isPaid ? 'Paid' : 'Not paid yet'}
                  />
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href={`/portal/payslips/${latestRun.id}`}>View payslip</Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Your first payslip will appear here.</p>
          )}
        </CardContent>
      </Card>

      <PayoutCard contractorId={contractor.id} />
    </div>
  )
}
