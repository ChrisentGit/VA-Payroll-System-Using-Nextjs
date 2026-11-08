import Link from 'next/link'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DeleteTimesheetButton from '@/components/timesheets/DeleteTimesheetButton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function PortalTimesheetsPage() {
  const { contractor } = await requirePortalContractor()

  const timesheets = await prisma.timesheet.findMany({
    where: { contractorId: contractor.id },
    orderBy: { date: 'desc' },
    include: { engagement: { include: { client: { select: { name: true } } } } },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Timesheets</h1>
        {contractor.status !== 'OFFBOARDED' && (
          <Link href="/portal/timesheets/new">
            <Button>Submit Timesheet</Button>
          </Link>
        )}
      </div>

      {timesheets.length === 0 ? (
        <p className="text-gray-500">No timesheets yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timesheets.map((t) => {
              const canChange = t.status !== 'APPROVED' && !t.payrollLineItemId

              return (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>{t.engagement.client.name}</TableCell>
                  <TableCell>{t.hours ? t.hours.toString() : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'APPROVED' ? 'default' : 'secondary'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-normal">
                    {t.status === 'REJECTED' ? t.rejectionReason : t.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {canChange && (
                      <div className="flex justify-end gap-2">
                        <Link href={`/portal/timesheets/${t.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <DeleteTimesheetButton id={t.id} apiPath="/api/portal/timesheets" />
                      </div>
                    )}
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
