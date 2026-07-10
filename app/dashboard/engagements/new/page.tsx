import { prisma } from '@/lib/prisma'
import EngagementForm from '@/components/engagements/EngagementForm'

export default async function NewEngagementPage() {
  const [contractors, clients] = await Promise.all([
    prisma.contractor.findMany({ orderBy: { name: 'asc' } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add Engagement</h1>
      <EngagementForm
        contractors={contractors.map((c) => ({ id: c.id, label: c.name }))}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  )
}