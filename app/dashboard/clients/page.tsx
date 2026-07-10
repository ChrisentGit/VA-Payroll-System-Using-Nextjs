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
import DeleteClientButton from '@/components/clients/DeleteClientButton'

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/dashboard/clients/new">
          <Button>Add Client</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-gray-500">No clients yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.contactPerson || '—'}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>{c.billingCurrency}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/dashboard/clients/${c.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteClientButton id={c.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}