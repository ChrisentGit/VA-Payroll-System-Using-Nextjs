import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EngagementForm from '@/components/engagements/EngagementForm'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditEngagementPage({ params }: EditPageProps) {
  const { id } = await params

  const [engagement, contractors, clients] = await Promise.all([
    prisma.engagement.findUnique({ where: { id } }),
    prisma.contractor.findMany({ orderBy: { name: 'asc' } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!engagement) {
    notFound()
  }

  return (
    <div className="p-6">
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
          status: engagement.status,
          startDate: engagement.startDate?.toISOString() || null,
          endDate: engagement.endDate?.toISOString() || null,
        }}
      />
    </div>
  )
}