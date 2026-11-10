import { BriefcaseBusiness } from 'lucide-react'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'
import TimesheetForm from '@/components/timesheets/TimesheetForm'
import { EmptyState } from '@/components/ui/empty-state'

export default async function PortalNewTimesheetPage() {
  const { contractor } = await requirePortalContractor()

  const engagements = await prisma.engagement.findMany({
    where: { contractorId: contractor.id, status: 'active' },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <PageHeader title="Log hours" back={{ href: '/portal/timesheets', label: 'Timesheets' }} />
      {engagements.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No active work to log against"
          description="Your finance team needs to set up an engagement for you first."
        />
      ) : (
        <FormPanel>
          <TimesheetForm
            apiPath="/api/portal/timesheets"
            returnTo="/portal/timesheets"
            quickHours
            engagements={engagements.map((e) => ({
              id: e.id,
              label: e.title ? `${e.client.name}, ${e.title}` : e.client.name,
            }))}
          />
        </FormPanel>
      )}
    </div>
  )
}
