import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditTimesheetPage({ params }: EditPageProps) {
  await requirePagePermission('timesheets:manage')

  const { id } = await params

  const [timesheet, engagements] = await Promise.all([
    prisma.timesheet.findUnique({ where: { id } }),
    prisma.engagement.findMany({
      include: { contractor: true, client: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!timesheet) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Timesheet" back={{ href: '/dashboard/timesheets', label: 'Timesheets' }} />
      <FormPanel>
        <TimesheetForm
          engagements={engagements.map((e) => ({
            id: e.id,
            label: `${e.contractor.name} → ${e.client.name}`,
          }))}
          timesheetId={timesheet.id}
          initialData={{
            engagementId: timesheet.engagementId,
            date: timesheet.date.toISOString(),
            hours: timesheet.hours?.toString() || null,
            description: timesheet.description,
          }}
        />
      </FormPanel>
    </div>
  )
}