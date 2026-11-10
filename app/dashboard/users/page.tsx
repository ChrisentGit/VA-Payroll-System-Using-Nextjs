import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { roleLabel } from '@/lib/labels'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
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

export default async function UsersPage() {
  await requirePagePermission('users:manage')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      contractor: { select: { name: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Users"
        description="Who can sign in, and what they can do."
        actions={
          <Button asChild>
            <Link href="/dashboard/users/new">
              <Plus aria-hidden />
              Add User
            </Link>
          </Button>
        }
      />

      <TablePanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Person name={user.name} detail={user.email} />
                </TableCell>
                <TableCell>{roleLabel(user.role)}</TableCell>
                <TableCell>{user.contractor?.name ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/users/${user.id}/edit`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TablePanel>
    </div>
  )
}
