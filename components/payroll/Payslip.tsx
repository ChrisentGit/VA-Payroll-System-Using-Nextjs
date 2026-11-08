import { formatDate, formatMoney } from '@/lib/format'
import type { PayslipData } from '@/lib/payroll/payslip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Payslip({ data }: { data: PayslipData }) {
  const { run, contractor, items, phpTotal } = data
  const paid = items.every((li) => li.paidAt !== null) ? items[0] : null

  return (
    <article className="max-w-3xl">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Payslip</h1>
          <p className="text-sm text-gray-600">
            {formatDate(run.payrollPeriod.startDate)} to {formatDate(run.payrollPeriod.endDate)}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{contractor.name}</div>
          <div className="text-gray-600">{contractor.email}</div>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">PHP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((li) => (
            <TableRow key={li.id}>
              <TableCell className="whitespace-normal">
                {li.engagement.client.name}
                {li.notes && <div className="text-xs text-gray-500">{li.notes}</div>}
              </TableCell>
              <TableCell>{li.rateType.replace('_', ' ')}</TableCell>
              <TableCell>{li.hours ? li.hours.toString() : '—'}</TableCell>
              <TableCell>{formatMoney(li.currency, li.rateAmount)}</TableCell>
              <TableCell>
                {formatMoney(li.currency, li.totalAmount)}
                {li.currency !== 'PHP' && li.exchangeRate && (
                  <div className="text-xs text-gray-500">at {li.exchangeRate.toString()}</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                {li.totalAmountPhp ? formatMoney('PHP', li.totalAmountPhp) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 text-right text-lg font-semibold">
        Total: {formatMoney('PHP', phpTotal)}
      </div>

      <dl className="mt-6 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-gray-600">Status</dt>
        <dd className="font-medium">{paid ? 'Paid' : 'Not paid yet'}</dd>
        {paid?.paidAt && (
          <>
            <dt className="text-gray-600">Paid on</dt>
            <dd>{formatDate(paid.paidAt)}</dd>
          </>
        )}
        {paid?.paidTo && (
          <>
            <dt className="text-gray-600">Paid to</dt>
            <dd>{paid.paidTo}</dd>
          </>
        )}
        {paid?.paymentReference && (
          <>
            <dt className="text-gray-600">Reference</dt>
            <dd>{paid.paymentReference}</dd>
          </>
        )}
      </dl>
    </article>
  )
}
