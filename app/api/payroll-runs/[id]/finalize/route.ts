import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { PayrollError } from '@/lib/payroll/generate'
import { lockDraftRun } from '@/lib/payroll/locks'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/payroll-runs/[id]/finalize
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params

    await prisma.$transaction(async (tx) => {
      const run = await lockDraftRun(tx, id, 'This payroll run is already finalized')

      if (run.lineItems.length === 0) {
        throw new PayrollError('This payroll run has nothing to pay')
      }

      const missing = [
        ...new Set(
          run.lineItems.filter((li) => li.totalAmountPhp === null).map((li) => li.currency)
        ),
      ]

      if (missing.length > 0) {
        throw new PayrollError(`Enter an exchange rate to PHP for: ${missing.join(', ')}`)
      }

      await tx.payrollRun.update({
        where: { id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
      })
      await tx.payrollPeriod.update({
        where: { id: run.payrollPeriodId },
        data: { status: 'closed' },
      })
      await recordAudit(tx, session, {
        action: 'payroll.run_finalized',
        entityType: 'PayrollRun',
        entityId: id,
        metadata: { lineItems: run.lineItems.length },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PayrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('POST /api/payroll-runs/[id]/finalize error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize payroll run' },
      { status: 500 }
    )
  }
}
