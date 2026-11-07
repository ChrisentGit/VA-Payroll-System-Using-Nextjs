import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/payroll-runs/[id]/finalize
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const run = await prisma.payrollRun.findUnique({ where: { id } })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status === 'FINALIZED') {
      return NextResponse.json(
        { error: 'This payroll run is already finalized' },
        { status: 400 }
      )
    }

    const finalized = await prisma.payrollRun.update({
      where: { id },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
      include: { lineItems: true },
    })

    return NextResponse.json(finalized)
  } catch (error) {
    console.error('POST /api/payroll-runs/[id]/finalize error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize payroll run' },
      { status: 500 }
    )
  }
}