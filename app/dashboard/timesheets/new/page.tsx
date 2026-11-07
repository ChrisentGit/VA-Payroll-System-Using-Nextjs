import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'

export default async function NewTimesheetPage() {
  await requirePagePermission('timesheets:manage')

  const engagements = await prisma.engagement.findMany({
    where: { status: 'active' },
    include: { contractor: true, client: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Submit Timesheet</h1>
      <TimesheetForm
        engagements={engagements.map((e) => ({
          id: e.id,
          label: `${e.contractor.name} → ${e.client.name}`,
        }))}
      />
    </div>
  )
}