import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import FinalizeRunButton from '@/components/payroll/FinalizeRunButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PayrollRunPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id } = await params
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      lineItems: {
        include: { contractor: true, engagement: { include: { client: true } } },
      },
    },
  })

  if (!run) notFound()

  const grandTotal = run.lineItems.reduce((sum, li) => sum + Number(li.totalAmount), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">
          Payroll Run — {run.payrollPeriod.startDate.toLocaleDateString()} to{' '}
          {run.payrollPeriod.endDate.toLocaleDateString()}
        </h1>
        <Badge variant={run.status === 'FINALIZED' ? 'default' : 'secondary'}>
          {run.status}
        </Badge>
      </div>

      {run.status === 'DRAFT' && (
        <div className="mb-6">
          <FinalizeRunButton runId={run.id} />
        </div>
      )}

      {run.lineItems.length === 0 ? (
        <p className="text-gray-500">
          No line items — no approved timesheets or active engagements were found for this period.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.contractor.name}</TableCell>
                  <TableCell>{li.engagement.client.name}</TableCell>
                  <TableCell>{li.rateType.replace('_', ' ')}</TableCell>
                  <TableCell>{li.hours ? li.hours.toString() : '—'}</TableCell>
                  <TableCell>
                    {li.currency} {li.rateAmount.toString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {li.currency} {li.totalAmount.toString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 text-right font-semibold text-lg">
            Grand total: {run.lineItems[0]?.currency} {grandTotal.toFixed(2)}
          </div>
        </>
      )}
    </div>
  )
}