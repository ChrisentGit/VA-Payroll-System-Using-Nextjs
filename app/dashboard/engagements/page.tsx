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
import DeleteEngagementButton from '@/components/engagements/DeleteEngagementButton'

export default async function EngagementsPage() {
  const engagements = await prisma.engagement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contractor: true,
      client: true,
      rates: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Engagements</h1>
        <Link href="/dashboard/engagements/new">
          <Button>Add Engagement</Button>
        </Link>
      </div>

      {engagements.length === 0 ? (
        <p className="text-gray-500">No engagements yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Rate type</TableHead>
              <TableHead>Current rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements.map((e) => {
              const currentRate = e.rates[0]
              return (
                <TableRow key={e.id}>
                  <TableCell>{e.contractor.name}</TableCell>
                  <TableCell>{e.client.name}</TableCell>
                  <TableCell>{e.rateType.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {currentRate
                      ? `${currentRate.currency} ${currentRate.amount}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === 'active' ? 'default' : 'secondary'}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/dashboard/engagements/${e.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteEngagementButton id={e.id} />
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