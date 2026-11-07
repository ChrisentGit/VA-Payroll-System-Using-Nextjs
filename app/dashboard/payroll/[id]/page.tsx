import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import GenerateRunButton from '@/components/payroll/GenerateRunButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PayrollPeriodPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id } = await params
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { runs: { orderBy: { generatedAt: 'desc' } } },
  })

  if (!period) notFound()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">
        Payroll Period: {period.startDate.toLocaleDateString()} —{' '}
        {period.endDate.toLocaleDateString()}
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Pay schedule: {period.frequency === 'SEMI_MONTHLY' ? 'Twice a month' : 'Monthly'}
      </p>

      {period.runs.length === 0 && (
        <div className="mb-6">
          <GenerateRunButton periodId={period.id} />
        </div>
      )}

      <h2 className="text-lg font-medium mb-3">Runs</h2>
      {period.runs.length === 0 ? (
        <p className="text-gray-500">No runs generated yet for this period.</p>
      ) : (
        <ul className="space-y-2">
          {period.runs.map((run) => (
            <li
              key={run.id}
              className="flex items-center justify-between border rounded-md p-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant={run.status === 'FINALIZED' ? 'default' : 'secondary'}>
                  {run.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Generated {run.generatedAt.toLocaleString()}
                </span>
              </div>
              <Link href={`/dashboard/payroll/runs/${run.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}