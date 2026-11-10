import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { decrypt } from '@/lib/crypto'
import { isoDate } from '@/lib/format'
import { methodLabel } from '@/lib/payment-details'
import { toCsv } from '@/lib/payroll/csv'

interface RouteParams {
  params: Promise<{ id: string }>
}

const HEADER = [
  'Contractor',
  'Email',
  'Client',
  'Type',
  'Hours',
  'Rate',
  'Currency',
  'Total',
  'Exchange rate',
  'Total PHP',
  'Payment method',
  'Account name',
  'Account number',
  'Bank',
  'Paid at',
  'Payment reference',
  'Notes',
]

// GET /api/payroll-runs/[id]/export — CSV of a finalized run, with full account
// numbers, so each download is written to the audit log first.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('contractors:sensitive')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        lineItems: {
          orderBy: [{ contractor: { name: 'asc' } }, { createdAt: 'asc' }],
          include: {
            contractor: {
              select: {
                name: true,
                email: true,
                paymentDetails: { where: { isDefault: true }, take: 1 },
              },
            },
            engagement: { include: { client: { select: { name: true } } } },
          },
        },
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status !== 'FINALIZED') {
      return NextResponse.json({ error: 'Finalize this run before exporting it' }, { status: 409 })
    }

    const rows = run.lineItems.map((li) => {
      const detail = li.contractor.paymentDetails[0]

      return [
        li.contractor.name,
        li.contractor.email,
        li.engagement.client.name,
        li.rateType,
        li.hours?.toString(),
        li.rateAmount.toFixed(2),
        li.currency,
        li.totalAmount.toFixed(2),
        li.exchangeRate?.toString(),
        li.totalAmountPhp?.toFixed(2),
        detail && methodLabel(detail.method),
        detail?.accountName,
        detail && decrypt(detail.accountNumber),
        detail?.bankName,
        li.paidAt?.toISOString(),
        li.paymentReference,
        li.notes,
      ]
    })

    await recordAudit(prisma, session, {
      action: 'payroll.exported',
      entityType: 'PayrollRun',
      entityId: id,
      metadata: { rows: rows.length },
    })

    const period = `${isoDate(run.payrollPeriod.startDate)}-to-${isoDate(run.payrollPeriod.endDate)}`

    return new NextResponse(toCsv([HEADER, ...rows]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-${period}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('GET /api/payroll-runs/[id]/export error:', error)
    return NextResponse.json({ error: 'Failed to export payroll run' }, { status: 500 })
  }
}
