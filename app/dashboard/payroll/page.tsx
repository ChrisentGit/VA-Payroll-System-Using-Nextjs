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

export default async function PayrollPage() {
  await requirePagePermission('payroll:manage')

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: { runs: true },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Payroll Periods</h1>
        <Link href="/dashboard/payroll/new">
          <Button>New Period</Button>
        </Link>
      </div>

      {periods.length === 0 ? (
        <p className="text-gray-500">No payroll periods yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.startDate.toLocaleDateString()} — {p.endDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {p.runs.length === 0 ? (
                    <span className="text-gray-400">No runs yet</span>
                  ) : (
                    <div className="flex gap-1">
                      {p.runs.map((r) => (
                        <Badge key={r.id} variant={r.status === 'FINALIZED' ? 'default' : 'secondary'}>
                          {r.status}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/payroll/${p.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}