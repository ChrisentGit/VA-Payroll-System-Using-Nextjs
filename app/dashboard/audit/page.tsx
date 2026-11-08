import Link from 'next/link'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  await requirePagePermission('audit:read')

  const requested = Number((await searchParams).page)
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1

  // One extra row shows whether there is a next page, without a separate count
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  })
  const entries = rows.slice(0, PAGE_SIZE)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Audit Log</h1>

      {entries.length === 0 ? (
        <p className="text-gray-500">Nothing here yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When (UTC)</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="tabular-nums">
                  {entry.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                </TableCell>
                <TableCell>{entry.actorEmail}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell className="text-xs text-gray-600">
                  {entry.entityType} {entry.entityId}
                </TableCell>
                <TableCell className="text-xs text-gray-600 whitespace-normal break-all">
                  {JSON.stringify(entry.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex gap-2 mt-4">
        {page > 1 && (
          <Link href={`/dashboard/audit?page=${page - 1}`}>
            <Button variant="outline" size="sm">
              Newer
            </Button>
          </Link>
        )}
        {rows.length > PAGE_SIZE && (
          <Link href={`/dashboard/audit?page=${page + 1}`}>
            <Button variant="outline" size="sm">
              Older
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
