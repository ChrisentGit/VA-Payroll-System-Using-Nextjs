import { requirePagePermission } from '@/lib/authz'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DeleteTimesheetButton from '@/components/timesheets/DeleteTimesheetButton'
import ApprovalButtons from '@/components/timesheets/ApprovalButtons'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

export default async function TimesheetsPage() {
  await requirePagePermission('timesheets:manage')

  const timesheets = await prisma.timesheet.findMany({
    orderBy: { date: 'desc' },
    include: { contractor: true, engagement: { include: { client: true } } },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Timesheets</h1>
        <Link href="/dashboard/timesheets/new">
          <Button>Submit Timesheet</Button>
        </Link>
      </div>

      {timesheets.length === 0 ? (
        <p className="text-gray-500">No timesheets yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timesheets.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.date.toLocaleDateString()}</TableCell>
                <TableCell>{t.contractor.name}</TableCell>
                <TableCell>{t.engagement.client.name}</TableCell>
                <TableCell>{t.hours ? t.hours.toString() : '—'}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[t.status] || 'secondary'}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    {t.status === 'SUBMITTED' && <ApprovalButtons id={t.id} />}
                    <Link href={`/dashboard/timesheets/${t.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteTimesheetButton id={t.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}