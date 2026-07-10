import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TimesheetForm from '@/components/timesheets/TimesheetForm'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditTimesheetPage({ params }: EditPageProps) {
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Timesheet</h1>
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
    </div>
  )
}