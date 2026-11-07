import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/payroll-runs/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        lineItems: {
          include: { contractor: true, engagement: { include: { client: true } } },
        },
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error('GET /api/payroll-runs/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll run' },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll-runs/[id] — only allowed while still DRAFT (e.g. to regenerate)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const run = await prisma.payrollRun.findUnique({ where: { id } })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status === 'FINALIZED') {
      return NextResponse.json(
        { error: 'Cannot delete a finalized payroll run' },
        { status: 400 }
      )
    }

    await prisma.payrollRun.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/payroll-runs/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payroll run' },
      { status: 500 }
    )
  }
}