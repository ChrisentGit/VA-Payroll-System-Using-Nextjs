import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import EngagementForm from '@/components/engagements/EngagementForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewEngagementPage() {
  await requirePagePermission('directory:write')

  const [contractors, clients] = await Promise.all([
    prisma.contractor.findMany({ orderBy: { name: 'asc' } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Add Engagement" back={{ href: '/dashboard/engagements', label: 'Engagements' }} />
      <FormPanel>
        <EngagementForm
          contractors={contractors.map((c) => ({ id: c.id, label: c.name }))}
          clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        />
      </FormPanel>
    </div>
  )
}