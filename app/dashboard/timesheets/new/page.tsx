import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewTimesheetPage() {
  await requirePagePermission('timesheets:manage')

  const engagements = await prisma.engagement.findMany({
    where: { status: 'active' },
    include: { contractor: true, client: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Submit Timesheet" back={{ href: '/dashboard/timesheets', label: 'Timesheets' }} />
      <FormPanel>
        <TimesheetForm
          engagements={engagements.map((e) => ({
            id: e.id,
            label: `${e.contractor.name} → ${e.client.name}`,
          }))}
        />
      </FormPanel>
    </div>
  )
}