import Link from 'next/link'
import { Plus, Wallet } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDateRange } from '@/lib/format'
import { payFrequencyLabel } from '@/lib/labels'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function PayrollPage() {
  await requirePagePermission('payroll:manage')

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: { runs: true },
  })

  const addButton = (
    <Button asChild>
      <Link href="/dashboard/payroll/new">
        <Plus aria-hidden />
        New Period
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Each period gets one run: draft it, set exchange rates, finalize, then pay."
        actions={periods.length > 0 && addButton}
      />

      {periods.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payroll periods yet"
          description="Create a period to generate your first payroll run."
          action={addButton}
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {formatDateRange(p.startDate, p.endDate)}
                  </TableCell>
                  <TableCell>{payFrequencyLabel(p.frequency)}</TableCell>
                  <TableCell>
                    {p.runs.length === 0 ? (
                      <span className="text-muted-foreground">Not generated</span>
                    ) : (
                      <div className="flex gap-1">
                        {p.runs.map((r) => (
                          <StatusBadge key={r.id} status={r.status} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/payroll/${p.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}
    </div>
  )
}
