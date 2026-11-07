import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import FinalizeRunButton from '@/components/payroll/FinalizeRunButton'
import DeleteRunButton from '@/components/payroll/DeleteRunButton'
import ExchangeRateForm from '@/components/payroll/ExchangeRateForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PayrollRunPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id } = await params
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      lineItems: {
        orderBy: { createdAt: 'asc' },
        include: { contractor: true, engagement: { include: { client: true } } },
      },
    },
  })

  if (!run) notFound()

  const isDraft = run.status === 'DRAFT'
  const warnings = Array.isArray(run.warnings) ? (run.warnings as string[]) : []

  const totalsByCurrency = new Map<string, Prisma.Decimal>()
  const ratesByCurrency = new Map<string, string>()
  let phpTotal = new Prisma.Decimal(0)
  let isFullyConverted = true

  for (const li of run.lineItems) {
    const current = totalsByCurrency.get(li.currency) ?? new Prisma.Decimal(0)
    totalsByCurrency.set(li.currency, current.plus(li.totalAmount))

    if (li.currency !== 'PHP') {
      ratesByCurrency.set(li.currency, li.exchangeRate?.toString() ?? '')
    }

    if (li.totalAmountPhp === null) {
      isFullyConverted = false
    } else {
      phpTotal = phpTotal.plus(li.totalAmountPhp)
    }
  }

  const foreignCurrencies = [...ratesByCurrency].map(([currency, rate]) => ({ currency, rate }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">
          Payroll Run — {run.payrollPeriod.startDate.toLocaleDateString()} to{' '}
          {run.payrollPeriod.endDate.toLocaleDateString()}
        </h1>
        <Badge variant={isDraft ? 'secondary' : 'default'}>{run.status}</Badge>
      </div>

      {isDraft && (
        <div className="flex gap-3 mb-6">
          <FinalizeRunButton runId={run.id} />
          <DeleteRunButton runId={run.id} periodId={run.payrollPeriodId} />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-amber-50 text-amber-900 text-sm p-4 rounded-md border border-amber-200 mb-6">
          <p className="font-medium mb-2">Check before paying</p>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {isDraft && foreignCurrencies.length > 0 && (
        <ExchangeRateForm
          key={foreignCurrencies.map((c) => c.rate).join()}
          runId={run.id}
          currencies={foreignCurrencies}
        />
      )}

      {run.lineItems.length === 0 ? (
        <p className="text-gray-500">Nothing is due for this period.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Total (PHP)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.contractor.name}</TableCell>
                  <TableCell>{li.engagement.client.name}</TableCell>
                  <TableCell>{li.rateType.replace('_', ' ')}</TableCell>
                  <TableCell>{li.hours ? li.hours.toString() : '—'}</TableCell>
                  <TableCell>
                    {li.currency} {li.rateAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {li.currency} {li.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {li.totalAmountPhp ? `PHP ${li.totalAmountPhp.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-normal">
                    {li.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 text-right space-y-1">
            {(totalsByCurrency.size > 1 || !isFullyConverted) &&
              [...totalsByCurrency].map(([currency, total]) => (
                <div key={currency} className="text-sm text-gray-600">
                  {currency} {total.toFixed(2)}
                </div>
              ))}
            <div className="font-semibold text-lg">
              {isFullyConverted
                ? `Grand total: PHP ${phpTotal.toFixed(2)}`
                : isDraft
                  ? 'Grand total: enter exchange rates to see the PHP total'
                  : 'No PHP conversion was recorded for this run'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
