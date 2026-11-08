import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'

export default async function PortalNewTimesheetPage() {
  const { contractor } = await requirePortalContractor()

  const engagements = await prisma.engagement.findMany({
    where: { contractorId: contractor.id, status: 'active' },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Submit Timesheet</h1>
      <TimesheetForm
        apiPath="/api/portal/timesheets"
        returnTo="/portal/timesheets"
        engagements={engagements.map((e) => ({
          id: e.id,
          label: e.title ? `${e.client.name} — ${e.title}` : e.client.name,
        }))}
      />
    </div>
  )
}
