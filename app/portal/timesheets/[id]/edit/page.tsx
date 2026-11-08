import { notFound, redirect } from 'next/navigation'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PortalEditTimesheetPage({ params }: PageProps) {
  const { contractor } = await requirePortalContractor()

  const { id } = await params
  const timesheet = await prisma.timesheet.findFirst({
    where: { id, contractorId: contractor.id },
    include: { engagement: { include: { client: { select: { name: true } } } } },
  })

  if (!timesheet) notFound()
  if (timesheet.status === 'APPROVED' || timesheet.payrollLineItemId) {
    redirect('/portal/timesheets')
  }

  const { engagement } = timesheet

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Timesheet</h1>
      {timesheet.status === 'REJECTED' && timesheet.rejectionReason && (
        <div className="bg-amber-50 text-amber-900 text-sm p-3 rounded-md border border-amber-200 mb-4 max-w-lg">
          Sent back: {timesheet.rejectionReason}
        </div>
      )}
      <TimesheetForm
        apiPath="/api/portal/timesheets"
        returnTo="/portal/timesheets"
        timesheetId={timesheet.id}
        engagements={[
          {
            id: engagement.id,
            label: engagement.title
              ? `${engagement.client.name} — ${engagement.title}`
              : engagement.client.name,
          },
        ]}
        initialData={{
          engagementId: timesheet.engagementId,
          date: timesheet.date.toISOString(),
          hours: timesheet.hours?.toString() ?? null,
          description: timesheet.description,
        }}
      />
    </div>
  )
}
