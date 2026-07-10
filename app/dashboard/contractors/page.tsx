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
import DeleteContractorButton from '@/components/contractors/DeleteContractorButton'

export default async function ContractorsPage() {
  const contractors = await prisma.contractor.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Contractors</h1>
        <Link href="/dashboard/contractors/new">
          <Button>Add Contractor</Button>
        </Link>
      </div>

      {contractors.length === 0 ? (
        <p className="text-gray-500">No contractors yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/dashboard/contractors/${c.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteContractorButton id={c.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}