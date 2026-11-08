import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { paymentProgress } from '@/lib/payroll/payments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const tile = (
    <Card className={href ? 'hover:bg-gray-50 transition-colors' : undefined}>
      <CardContent>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{tile}</Link> : tile
}

async function DirectoryStats() {
  const [contractors, clients, engagements] = await Promise.all([
    prisma.contractor.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.engagement.count({ where: { status: 'active' } }),
  ])

  return (
    <>
      <Stat label="Active contractors" value={contractors} href="/dashboard/contractors" />
      <Stat label="Active clients" value={clients} href="/dashboard/clients" />
      <Stat label="Active engagements" value={engagements} href="/dashboard/engagements" />
    </>
  )
}

async function ApprovalStat() {
  const waiting = await prisma.timesheet.count({ where: { status: 'SUBMITTED' } })

  return <Stat label="Timesheets to approve" value={waiting} href="/dashboard/timesheets" />
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
      <Stat label="Finalized, not yet paid" value={formatMoney('PHP', unpaid._sum.totalAmountPhp ?? 0)} />
      <Stat label="Paid in the last 30 days" value={formatMoney('PHP', paid._sum.totalAmountPhp ?? 0)} />
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
    return <p className="text-sm text-gray-500">No payroll runs yet.</p>
  }

  return (
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
              <TableCell>
                {formatDate(run.payrollPeriod.startDate)} to {formatDate(run.payrollPeriod.endDate)}
              </TableCell>
              <TableCell>
                <Badge variant={run.status === 'FINALIZED' ? 'default' : 'secondary'}>
                  {run.status}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">
                {run.status === 'FINALIZED' ? `${paid} of ${total}` : '—'}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/dashboard/payroll/runs/${run.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role
  if (can(role, 'portal:access')) redirect('/portal')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {can(role, 'directory:read') && <DirectoryStats />}
        {can(role, 'timesheets:manage') && <ApprovalStat />}
        {can(role, 'payroll:manage') && <PayrollStats />}
      </div>

      {can(role, 'payroll:manage') && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent payroll runs</h2>
          <RecentRuns />
        </section>
      )}
    </div>
  )
}
