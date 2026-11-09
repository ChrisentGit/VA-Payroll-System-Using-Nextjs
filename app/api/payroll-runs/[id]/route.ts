import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { PayrollError } from '@/lib/payroll/generate'
import { lockDraftRun } from '@/lib/payroll/locks'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/payroll-runs/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

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
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params

    await prisma.$transaction(async (tx) => {
      const run = await lockDraftRun(tx, id, 'Cannot delete a finalized payroll run')

      await tx.payrollRun.delete({ where: { id } })
      await recordAudit(tx, session, {
        action: 'payroll.run_deleted',
        entityType: 'PayrollRun',
        entityId: id,
        metadata: { periodId: run.payrollPeriodId },
      })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PayrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('DELETE /api/payroll-runs/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payroll run' },
      { status: 500 }
    )
  }
}