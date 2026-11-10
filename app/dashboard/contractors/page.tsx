import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Person } from '@/components/ui/person'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function ContractorsPage() {
  const session = await requirePagePermission('directory:read')
  const canEdit = can(session.user.role, 'directory:write')

  const contractors = await prisma.contractor.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const addButton = canEdit && (
    <Button asChild>
      <Link href="/dashboard/contractors/new">
        <Plus aria-hidden />
        Add Contractor
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Contractors"
        description="Everyone you pay, and how to reach them."
        actions={contractors.length > 0 && addButton}
      />

      {contractors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contractors yet"
          description="Add a contractor, then link them to a client with an engagement."
          action={addButton}
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Person name={c.name} detail={c.email} />
                  </TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/contractors/${c.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteButton url={`/api/contractors/${c.id}`} noun="contractor" />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}
    </div>
  )
}
