import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/payroll-runs/[id]/finalize
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { lineItems: true },
    })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status === 'FINALIZED') {
      return NextResponse.json(
        { error: 'This payroll run is already finalized' },
        { status: 409 }
      )
    }
    if (run.lineItems.length === 0) {
      return NextResponse.json(
        { error: 'This payroll run has nothing to pay' },
        { status: 400 }
      )
    }

    const missing = [
      ...new Set(
        run.lineItems.filter((li) => li.totalAmountPhp === null).map((li) => li.currency)
      ),
    ]

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Enter an exchange rate to PHP for: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.payrollRun.update({
        where: { id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
      }),
      prisma.payrollPeriod.update({
        where: { id: run.payrollPeriodId },
        data: { status: 'closed' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/payroll-runs/[id]/finalize error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize payroll run' },
      { status: 500 }
    )
  }
}
