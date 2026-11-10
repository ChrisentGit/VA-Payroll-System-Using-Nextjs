import { notFound, redirect } from 'next/navigation'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'
import TimesheetForm from '@/components/timesheets/TimesheetForm'
import { Notice } from '@/components/ui/notice'

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
    <div>
      <PageHeader title="Edit Timesheet" back={{ href: '/portal/timesheets', label: 'Timesheets' }} />
      {timesheet.status === 'REJECTED' && timesheet.rejectionReason && (
        <Notice tone="warning" title="Sent back" className="mb-4 max-w-2xl">
          {timesheet.rejectionReason}
        </Notice>
      )}
      <FormPanel>
        <TimesheetForm
          apiPath="/api/portal/timesheets"
          returnTo="/portal/timesheets"
          quickHours
          timesheetId={timesheet.id}
          engagements={[
            {
              id: engagement.id,
              label: engagement.title
                ? `${engagement.client.name}, ${engagement.title}`
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
      </FormPanel>
    </div>
  )
}
