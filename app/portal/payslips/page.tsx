import Link from 'next/link'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDate, formatMoney } from '@/lib/format'
import { groupPayments } from '@/lib/payroll/payments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Payslips</h1>

      {runs.length === 0 ? (
        <p className="text-gray-500">No payslips yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const [payment] = groupPayments(run.lineItems)

              return (
                <TableRow key={run.id}>
                  <TableCell>
                    {formatDate(run.payrollPeriod.startDate)} to{' '}
                    {formatDate(run.payrollPeriod.endDate)}
                  </TableCell>
                  <TableCell>{formatMoney('PHP', payment.phpTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={payment.isPaid ? 'default' : 'secondary'}>
                      {payment.isPaid ? 'Paid' : 'Not paid yet'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/portal/payslips/${run.id}`}>
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
      )}
    </div>
  )
}
