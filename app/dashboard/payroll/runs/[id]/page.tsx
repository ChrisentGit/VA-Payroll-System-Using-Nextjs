import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { Download, Wallet } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatDateRange, formatMomentDate, formatMoney } from '@/lib/format'
import { rateTypeLabel } from '@/lib/labels'
import { groupPayments } from '@/lib/payroll/payments'
import DeleteButton from '@/components/DeleteButton'
import ExchangeRateForm from '@/components/payroll/ExchangeRateForm'
import FinalizeRunButton from '@/components/payroll/FinalizeRunButton'
import PaymentButtons from '@/components/payroll/PaymentButtons'
import RunStepper from '@/components/payroll/RunStepper'
import PageHeader from '@/components/shell/PageHeader'
import { TablePanel } from '@/components/shell/Panels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
  const payments = groupPayments(run.lineItems)
  const allPaid = payments.length > 0 && payments.every((payment) => payment.isPaid)

  return (
    <div>
      <PageHeader
        title={formatDateRange(run.payrollPeriod.startDate, run.payrollPeriod.endDate)}
        description={<StatusBadge status={run.status} />}
        back={{ href: `/dashboard/payroll/${run.payrollPeriodId}`, label: 'Payroll period' }}
        actions={
          isDraft ? (
            <>
              <FinalizeRunButton runId={run.id} />
              <DeleteButton
                url={`/api/payroll-runs/${run.id}`}
                noun="draft run"
                description="Its timesheets and milestones go back to unpaid, and you can generate it again."
                label="Delete Draft"
                redirectTo={`/dashboard/payroll/${run.payrollPeriodId}`}
              />
            </>
          ) : (
            // A plain link on purpose: the response is a file download
            <Button asChild variant="outline">
              <a href={`/api/payroll-runs/${run.id}/export`}>
                <Download aria-hidden />
                Export CSV
              </a>
            </Button>
          )
        }
      />

      <RunStepper
        steps={[
          { label: 'Draft generated', done: true },
          { label: 'Exchange rates set', done: isFullyConverted },
          { label: 'Finalized', done: !isDraft },
          { label: 'Everyone paid', done: !isDraft && allPaid },
        ]}
      />

      {warnings.length > 0 && (
        <Notice tone="warning" title="Check before paying" className="mb-6">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}

      {isDraft && foreignCurrencies.length > 0 && (
        <ExchangeRateForm
          key={foreignCurrencies.map((c) => c.rate).join()}
          runId={run.id}
          currencies={foreignCurrencies}
        />
      )}

      {run.lineItems.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nothing is due for this period"
          description="No approved timesheets, retainers or completed milestones fall inside these dates."
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-base font-semibold">Line items</h2>
            <TablePanel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Total (PHP)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell className="font-medium">{li.contractor.name}</TableCell>
                      <TableCell>{li.engagement.client.name}</TableCell>
                      <TableCell>{rateTypeLabel(li.rateType)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {li.hours ? li.hours.toString() : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(li.currency, li.rateAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(li.currency, li.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {li.totalAmountPhp ? formatMoney('PHP', li.totalAmountPhp) : '—'}
                      </TableCell>
                      <TableCell className="min-w-48 text-xs whitespace-normal text-muted-foreground">
                        {li.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-1 border-t bg-muted/40 px-4 py-3 text-right">
                {(totalsByCurrency.size > 1 || !isFullyConverted) &&
                  [...totalsByCurrency].map(([currency, total]) => (
                    <div key={currency} className="text-sm text-muted-foreground tabular-nums">
                      {formatMoney(currency, total)}
                    </div>
                  ))}
                <div className="text-base font-semibold tabular-nums">
                  {isFullyConverted
                    ? `Grand total: ${formatMoney('PHP', phpTotal)}`
                    : isDraft
                      ? 'Enter exchange rates to see the PHP total'
                      : 'No PHP conversion was recorded for this run'}
                </div>
              </div>
            </TablePanel>
          </section>

          {!isDraft && (
            <section className="mt-8">
              <h2 className="mb-3 text-base font-semibold">Payments</h2>
              <TablePanel>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid to</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.contractorId}>
                        <TableCell className="font-medium">{payment.first.contractor.name}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney('PHP', payment.phpTotal)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={payment.isPaid ? 'PAID' : 'UNPAID'}
                            label={
                              payment.isPaid && payment.first.paidAt
                                ? `Paid ${formatMomentDate(payment.first.paidAt)}`
                                : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>{payment.isPaid ? payment.first.paidTo || '—' : '—'}</TableCell>
                        <TableCell>
                          {payment.isPaid ? payment.first.paymentReference || '—' : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/payroll/runs/${run.id}/payslips/${payment.contractorId}`}>
                                Payslip
                              </Link>
                            </Button>
                            <PaymentButtons
                              runId={run.id}
                              contractorId={payment.contractorId}
                              contractorName={payment.first.contractor.name}
                              isPaid={payment.isPaid}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TablePanel>
            </section>
          )}
        </>
      )}
    </div>
  )
}
