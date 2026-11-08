import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { encrypt } from '@/lib/crypto'
import { isPaymentMethod, toMaskedDetail } from '@/lib/payment-details'

interface RouteParams {
  params: Promise<{ id: string }>
}

const NOT_FOUND = 'Payment detail not found'

// PATCH /api/payment-details/[id] — a blank accountNumber keeps the saved one.
// isDefault can only be turned on; another detail takes over by being made default.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('contractors:sensitive')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const { method, accountName, accountNumber, bankName, isDefault } = await request.json()

    if (method !== undefined && !isPaymentMethod(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }
    if (accountName !== undefined && !accountName) {
      return NextResponse.json({ error: 'accountName cannot be empty' }, { status: 400 })
    }

    const existing = await prisma.contractorPaymentDetail.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    }

    const detail = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.contractorPaymentDetail.updateMany({
          where: { contractorId: existing.contractorId, id: { not: id } },
          data: { isDefault: false },
        })
      }

      const updated = await tx.contractorPaymentDetail.update({
        where: { id },
        data: {
          method,
          accountName,
          bankName: bankName === undefined ? undefined : bankName || null,
          ...(accountNumber && { accountNumber: encrypt(String(accountNumber)) }),
          ...(isDefault === true && { isDefault: true }),
        },
      })

      await recordAudit(tx, session, {
        action: 'payment_detail.updated',
        entityType: 'Contractor',
        entityId: existing.contractorId,
        metadata: {
          detailId: id,
          method: updated.method,
          accountNumberChanged: Boolean(accountNumber),
          isDefault: updated.isDefault,
        },
      })

      return updated
    })

    return NextResponse.json(toMaskedDetail(detail))
  } catch (error) {
    console.error('PATCH /api/payment-details/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update payment detail' }, { status: 500 })
  }
}

// DELETE /api/payment-details/[id] — the newest remaining detail becomes the default
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('contractors:sensitive')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const existing = await prisma.contractorPaymentDetail.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.contractorPaymentDetail.delete({ where: { id } })

      if (existing.isDefault) {
        const next = await tx.contractorPaymentDetail.findFirst({
          where: { contractorId: existing.contractorId },
          orderBy: { createdAt: 'desc' },
        })
        if (next) {
          await tx.contractorPaymentDetail.update({
            where: { id: next.id },
            data: { isDefault: true },
          })
        }
      }

      await recordAudit(tx, session, {
        action: 'payment_detail.deleted',
        entityType: 'Contractor',
        entityId: existing.contractorId,
        metadata: { detailId: id, method: existing.method },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/payment-details/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete payment detail' }, { status: 500 })
  }
}
