import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
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
    <div>
      <PageHeader title="Audit Log" description="Every change and sign-in, newest first. Times are UTC." />

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing here yet"
          description="Changes and sign-ins will be recorded here as they happen."
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {entry.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </TableCell>
                  <TableCell>{entry.actorEmail}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{entry.action}</code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.entityType} {entry.entityId}
                  </TableCell>
                  <TableCell className="min-w-64 font-mono text-xs break-all whitespace-normal text-muted-foreground">
                    {JSON.stringify(entry.metadata)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}

      <div className="mt-4 flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/audit?page=${page - 1}`}>Newer</Link>
          </Button>
        )}
        {rows.length > PAGE_SIZE && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/audit?page=${page + 1}`}>Older</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
