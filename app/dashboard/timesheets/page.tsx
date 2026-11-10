import Link from 'next/link'
import { Clock, Plus } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import ApprovalButtons from '@/components/timesheets/ApprovalButtons'
import { Badge } from '@/components/ui/badge'
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

export default async function TimesheetsPage() {
  await requirePagePermission('timesheets:manage')

  const timesheets = await prisma.timesheet.findMany({
    orderBy: { date: 'desc' },
    include: { contractor: true, engagement: { include: { client: true } } },
  })

  const addButton = (
    <Button asChild>
      <Link href="/dashboard/timesheets/new">
        <Plus aria-hidden />
        Submit Timesheet
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Timesheets"
        description="Approve hours before they go into a payroll run."
        actions={timesheets.length > 0 && addButton}
      />

      {timesheets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timesheets yet"
          description="Hours your contractors submit will appear here for approval."
          action={addButton}
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.contractor.name}</TableCell>
                  <TableCell>{t.engagement.client.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.hours ? t.hours.toString() : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {t.payrollLineItemId ? (
                        <Badge variant="outline">In payroll</Badge>
                      ) : (
                        <>
                          {t.status === 'SUBMITTED' && <ApprovalButtons id={t.id} />}
                          {t.status === 'APPROVED' && <ApprovalButtons id={t.id} rejectOnly />}
                          {t.status !== 'APPROVED' && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/timesheets/${t.id}/edit`}>Edit</Link>
                            </Button>
                          )}
                          <DeleteButton url={`/api/timesheets/${t.id}`} noun="timesheet entry" />
                        </>
                      )}
                    </div>
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
