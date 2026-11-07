import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EngagementForm from '@/components/engagements/EngagementForm'
import RateHistoryCard from '@/components/engagements/RateHistoryCard'
import MilestonesCard from '@/components/engagements/MilestonesCard'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditEngagementPage({ params }: EditPageProps) {
  await requirePagePermission('directory:write')

  const { id } = await params

  const [engagement, contractors, clients, rates, milestones] = await Promise.all([
    prisma.engagement.findUnique({ where: { id } }),
    prisma.contractor.findMany({ orderBy: { name: 'asc' } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
    prisma.rate.findMany({
      where: { engagementId: id },
      orderBy: { effectiveFrom: 'desc' },
    }),
    prisma.milestone.findMany({
      where: { engagementId: id },
      orderBy: { createdAt: 'asc' },
      include: { lineItem: { select: { id: true } } },
    }),
  ])

  if (!engagement) {
    notFound()
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-6">Edit Engagement</h1>
        <EngagementForm
          contractors={contractors.map((c) => ({ id: c.id, label: c.name }))}
          clients={clients.map((c) => ({ id: c.id, label: c.name }))}
          engagementId={engagement.id}
          initialData={{
            contractorId: engagement.contractorId,
            clientId: engagement.clientId,
            title: engagement.title,
            rateType: engagement.rateType,
            retainerBasis: engagement.retainerBasis,
            projectPayMode: engagement.projectPayMode,
            status: engagement.status,
            startDate: engagement.startDate?.toISOString() || null,
            endDate: engagement.endDate?.toISOString() || null,
          }}
        />
      </div>

      <RateHistoryCard
        engagementId={engagement.id}
        rates={rates.map((r) => ({
          id: r.id,
          amount: r.amount.toString(),
          currency: r.currency,
          effectiveFrom: r.effectiveFrom.toISOString(),
          effectiveTo: r.effectiveTo?.toISOString() || null,
          notes: r.notes,
        }))}
      />

      {engagement.rateType === 'PER_PROJECT' && (
        <MilestonesCard
          engagementId={engagement.id}
          payMode={engagement.projectPayMode}
          milestones={milestones.map((m) => ({
            id: m.id,
            title: m.title,
            amount: m.amount.toFixed(2),
            currency: m.currency,
            completedAt: m.completedAt?.toISOString() || null,
            inPayroll: Boolean(m.lineItem),
          }))}
        />
      )}
    </div>
  )
}