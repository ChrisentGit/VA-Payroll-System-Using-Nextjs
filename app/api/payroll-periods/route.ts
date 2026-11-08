import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { getPayrollSettings } from '@/lib/payroll/settings'

// GET /api/payroll-periods — list all periods with their runs
export async function GET() {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    const periods = await prisma.payrollPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: { runs: true },
    })
    return NextResponse.json(periods)
  } catch (error) {
    console.error('GET /api/payroll-periods error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

// POST /api/payroll-periods — create a new period
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after the start date' },
        { status: 400 }
      )
    }

    const overlapping = await prisma.payrollPeriod.findFirst({
      where: { startDate: { lte: end }, endDate: { gte: start } },
    })

    if (overlapping) {
      const from = overlapping.startDate.toISOString().slice(0, 10)
      const to = overlapping.endDate.toISOString().slice(0, 10)
      return NextResponse.json(
        { error: `These dates overlap an existing period (${from} to ${to})` },
        { status: 409 }
      )
    }

    const { payFrequency } = await getPayrollSettings()

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollPeriod.create({
        data: { startDate: start, endDate: end, frequency: payFrequency },
      })
      await recordAudit(tx, session, {
        action: 'payroll.period_created',
        entityType: 'PayrollPeriod',
        entityId: created.id,
        metadata: { startDate, endDate, frequency: payFrequency },
      })
      return created
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('POST /api/payroll-periods error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}
