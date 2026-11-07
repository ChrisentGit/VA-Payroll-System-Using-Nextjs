import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

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

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A payroll period with these exact dates already exists' },
        { status: 409 }
      )
    }
    console.error('POST /api/payroll-periods error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}