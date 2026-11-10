import Link from 'next/link'
import { Clock, Plus } from 'lucide-react'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import PageHeader from '@/components/shell/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Waiting for approval',
  REJECTED: 'Sent back',
}

export default async function PortalTimesheetsPage() {
  const { contractor } = await requirePortalContractor()

  const timesheets = await prisma.timesheet.findMany({
    where: { contractorId: contractor.id },
    orderBy: { date: 'desc' },
    include: { engagement: { include: { client: { select: { name: true } } } } },
  })

  const isOffboarded = contractor.status === 'OFFBOARDED'
  const addButton = !isOffboarded && (
    <Button asChild className="w-full sm:w-auto">
      <Link href="/portal/timesheets/new">
        <Plus aria-hidden />
        Log hours
      </Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Timesheets"
        description="Hours you have logged and where they stand."
        actions={timesheets.length > 0 && addButton}
      />

      {timesheets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timesheets yet"
          description="Log your hours and they will be sent for approval."
          action={addButton}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {timesheets.map((t) => {
            const canChange = t.status !== 'APPROVED' && !t.payrollLineItemId && !isOffboarded

            return (
              <li key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{formatDate(t.date)}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{t.engagement.client.name}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{t.hours ? `${t.hours} hrs` : '—'}</div>
                  </div>
                </div>

                <div className="mt-2">
                  <StatusBadge status={t.status} label={STATUS_LABELS[t.status]} />
                </div>

                {t.status === 'REJECTED' && t.rejectionReason ? (
                  <p className="mt-2 text-sm text-red-700">{t.rejectionReason}</p>
                ) : (
                  t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                )}

                {canChange && (
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/portal/timesheets/${t.id}/edit`}>
                        {t.status === 'REJECTED' ? 'Fix and resubmit' : 'Edit'}
                      </Link>
                    </Button>
                    <DeleteButton url={`/api/portal/timesheets/${t.id}`} noun="timesheet entry" />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
