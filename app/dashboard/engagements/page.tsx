import Link from 'next/link'
import { BriefcaseBusiness, Plus } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/format'
import { rateTypeLabel } from '@/lib/labels'
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

export default async function EngagementsPage() {
  const session = await requirePagePermission('directory:read')
  const canEdit = can(session.user.role, 'directory:write')

  const engagements = await prisma.engagement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contractor: true,
      client: true,
      rates: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
    },
  })

  const addButton = canEdit && (
    <Button asChild>
      <Link href="/dashboard/engagements/new">
        <Plus aria-hidden />
        Add Engagement
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Engagements"
        description="Who works for which client, and at what rate."
        actions={engagements.length > 0 && addButton}
      />

      {engagements.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No engagements yet"
          description="An engagement links a contractor to a client and sets their rate."
          action={addButton}
        />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Rate type</TableHead>
                <TableHead className="text-right">Current rate</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagements.map((e) => {
                const currentRate = e.rates[0]

                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.contractor.name}</TableCell>
                    <TableCell>{e.client.name}</TableCell>
                    <TableCell>{rateTypeLabel(e.rateType)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {currentRate ? formatMoney(currentRate.currency, currentRate.amount) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={e.status} />
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/engagements/${e.id}/edit`}>Edit</Link>
                          </Button>
                          <DeleteButton url={`/api/engagements/${e.id}`} noun="engagement" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TablePanel>
      )}
    </div>
  )
}
