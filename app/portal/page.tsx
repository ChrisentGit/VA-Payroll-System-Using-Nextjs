import Link from 'next/link'
import { requirePortalContractor } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/format'
import { methodLabel, toMaskedDetail } from '@/lib/payment-details'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PortalHomePage() {
  const { contractor } = await requirePortalContractor()

  const [details, waiting, rejected, latestRun] = await Promise.all([
    prisma.contractorPaymentDetail.findMany({
      where: { contractorId: contractor.id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.timesheet.count({ where: { contractorId: contractor.id, status: 'SUBMITTED' } }),
    prisma.timesheet.count({ where: { contractorId: contractor.id, status: 'REJECTED' } }),
    prisma.payrollRun.findFirst({
      where: { status: 'FINALIZED', lineItems: { some: { contractorId: contractor.id } } },
      orderBy: { finalizedAt: 'desc' },
      include: { payrollPeriod: true },
    }),
  ])

  const paymentDetail = details.find((d) => d.isDefault)
  const masked = paymentDetail ? toMaskedDetail(paymentDetail) : null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Welcome, {contractor.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Timesheets</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              {waiting} waiting for approval, {rejected} sent back to you
            </p>
            <Link href="/portal/timesheets">
              <Button variant="outline" size="sm">
                View timesheets
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest payslip</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            {latestRun ? (
              <>
                <p>
                  {formatDate(latestRun.payrollPeriod.startDate)} to{' '}
                  {formatDate(latestRun.payrollPeriod.endDate)}
                </p>
                <Link href={`/portal/payslips/${latestRun.id}`}>
                  <Button variant="outline" size="sm">
                    View payslip
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-gray-500">No payslips yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where you get paid</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {masked ? (
              <p>
                {masked.bankName || methodLabel(masked.method)} {masked.accountNumberMasked}
              </p>
            ) : (
              <p className="text-gray-500">No payment details on file.</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              To change this, contact your finance team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
