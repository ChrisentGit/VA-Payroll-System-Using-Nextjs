import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
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

export default async function ClientsPage() {
  const session = await requirePagePermission('directory:read')
  const canEdit = can(session.user.role, 'directory:write')

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const addButton = canEdit && (
    <Button asChild>
      <Link href="/dashboard/clients/new">
        <Plus aria-hidden />
        Add Client
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Clients"
        description="The companies your contractors work with."
        actions={clients.length > 0 && addButton}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add a client so you can assign contractors to them."
          action={addButton}
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contactPerson || '—'}</TableCell>
                  <TableCell>{c.email || '—'}</TableCell>
                  <TableCell>{c.billingCurrency}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/clients/${c.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteButton url={`/api/clients/${c.id}`} noun="client" />
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
