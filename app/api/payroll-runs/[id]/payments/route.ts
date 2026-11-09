import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalText, readBody, requiredText } from '@/lib/validation'
import { describeDetail } from '@/lib/payment-details'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function findFinalizedRun(id: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id }, select: { status: true } })

  if (!run) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
  if (run.status !== 'FINALIZED') {
    return NextResponse.json({ error: 'Finalize this run before recording payments' }, { status: 409 })
  }

  return null
}

// POST /api/payroll-runs/[id]/payments — body { contractorId, paymentReference? }
// Marks everything still unpaid for that contractor in this run as paid.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const contractorId = requiredText(body.contractorId, 'contractorId')
    const paymentReference = optionalText(body.paymentReference, 'paymentReference', 200) ?? null

    const problem = await findFinalizedRun(id)
    if (problem) return problem

    const detail = await prisma.contractorPaymentDetail.findFirst({
      where: { contractorId, isDefault: true },
    })

    const count = await prisma.$transaction(async (tx) => {
      // The paidAt filter is what stops a double click recording two payments
      const result = await tx.payrollLineItem.updateMany({
        where: { payrollRunId: id, contractorId, paidAt: null },
        data: {
          paidAt: new Date(),
          paidBy: session.user.name || session.user.email || 'Unknown',
          paidTo: detail ? describeDetail(detail) : null,
          paymentReference,
        },
      })

      if (result.count > 0) {
        await recordAudit(tx, session, {
          action: 'payroll.marked_paid',
          entityType: 'PayrollRun',
          entityId: id,
          metadata: {
            contractorId,
            lineItems: result.count,
            paymentReference,
          },
        })
      }

      return result.count
    })

    if (count === 0) {
      return NextResponse.json(
        { error: 'Nothing is waiting to be paid for this contractor in this run' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, lineItems: count })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/payroll-runs/[id]/payments error:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}

// DELETE /api/payroll-runs/[id]/payments?contractorId=... — corrects a mistaken "paid"
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const contractorId = request.nextUrl.searchParams.get('contractorId')

    if (!contractorId) {
      return NextResponse.json({ error: 'contractorId is required' }, { status: 400 })
    }

    const problem = await findFinalizedRun(id)
    if (problem) return problem

    const count = await prisma.$transaction(async (tx) => {
      const result = await tx.payrollLineItem.updateMany({
        where: { payrollRunId: id, contractorId, paidAt: { not: null } },
        data: { paidAt: null, paidBy: null, paidTo: null, paymentReference: null },
      })

      if (result.count > 0) {
        await recordAudit(tx, session, {
          action: 'payroll.payment_undone',
          entityType: 'PayrollRun',
          entityId: id,
          metadata: { contractorId, lineItems: result.count },
        })
      }

      return result.count
    })

    if (count === 0) {
      return NextResponse.json({ error: 'No payment is recorded for this contractor' }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/payroll-runs/[id]/payments error:', error)
    return NextResponse.json({ error: 'Failed to undo payment' }, { status: 500 })
  }
}
