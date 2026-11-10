import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Banknote, BriefcaseBusiness, Building2, Clock, HandCoins, Users, Wallet } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/permissions'
import { formatDateRange, formatMoney } from '@/lib/format'
import { firstName } from '@/lib/labels'
import { paymentProgress } from '@/lib/payroll/payments'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat } from '@/components/ui/stat'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

async function DirectoryStats() {
  const [contractors, clients, engagements] = await Promise.all([
    prisma.contractor.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.engagement.count({ where: { status: 'active' } }),
  ])

  return (
    <>
      <Stat label="Active contractors" value={contractors} icon={Users} href="/dashboard/contractors" />
      <Stat label="Active clients" value={clients} icon={Building2} href="/dashboard/clients" />
      <Stat label="Active engagements" value={engagements} icon={BriefcaseBusiness} href="/dashboard/engagements" />
    </>
  )
}

async function ApprovalStat() {
  const waiting = await prisma.timesheet.count({ where: { status: 'SUBMITTED' } })

  return (
    <Stat
      label="Timesheets to approve"
      value={waiting}
      icon={Clock}
      href="/dashboard/timesheets"
      highlight={waiting > 0}
    />
  )
}

function loadPayrollTotals() {
  const since = new Date(Date.now() - THIRTY_DAYS_MS)

  return Promise.all([
    prisma.payrollLineItem.aggregate({
      where: { paidAt: null, payrollRun: { status: 'FINALIZED' } },
      _sum: { totalAmountPhp: true },
    }),
    prisma.payrollLineItem.aggregate({
      where: { paidAt: { gte: since } },
      _sum: { totalAmountPhp: true },
    }),
  ])
}

async function PayrollStats() {
  const [unpaid, paid] = await loadPayrollTotals()

  return (
    <>
      <Stat
        label="Finalized, not yet paid"
        value={formatMoney('PHP', unpaid._sum.totalAmountPhp ?? 0)}
        icon={HandCoins}
        href="/dashboard/payroll"
      />
      <Stat
        label="Paid in the last 30 days"
        value={formatMoney('PHP', paid._sum.totalAmountPhp ?? 0)}
        icon={Banknote}
      />
    </>
  )
}

async function RecentRuns() {
  const runs = await prisma.payrollRun.findMany({
    take: 5,
    orderBy: { generatedAt: 'desc' },
    include: {
      payrollPeriod: true,
      lineItems: { select: { contractorId: true, totalAmountPhp: true, paidAt: true } },
    },
  })

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payroll runs yet"
        description="Create a payroll period and generate your first run."
        action={
          <Button asChild>
            <Link href="/dashboard/payroll/new">New Period</Link>
          </Button>
        }
      />
    )
  }

  return (
    <TablePanel>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contractors paid</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const { paid, total } = paymentProgress(run.lineItems)

            return (
              <TableRow key={run.id}>
                <TableCell className="font-medium">
                  {formatDateRange(run.payrollPeriod.startDate, run.payrollPeriod.endDate)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {run.status === 'FINALIZED' ? `${paid} of ${total}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/payroll/runs/${run.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TablePanel>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role
  if (can(role, 'portal:access')) redirect('/portal')

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName(session.user.name)}`}
        description="Here is where payroll stands today."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {can(role, 'directory:read') && <DirectoryStats />}
        {can(role, 'timesheets:manage') && <ApprovalStat />}
        {can(role, 'payroll:manage') && <PayrollStats />}
      </div>

      {can(role, 'payroll:manage') && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Recent payroll runs</h2>
          <RecentRuns />
        </section>
      )}
    </div>
  )
}
