import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalText, readBody, requiredText } from '@/lib/validation'
import { encrypt } from '@/lib/crypto'
import { isPaymentMethod, toMaskedDetail } from '@/lib/payment-details'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/contractors/[id]/payment-details — account numbers are masked
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('contractors:sensitive')
    if (guard.error) return guard.error

    const { id } = await params
    const details = await prisma.contractorPaymentDetail.findMany({
      where: { contractorId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(details.map(toMaskedDetail))
  } catch (error) {
    console.error('GET /api/contractors/[id]/payment-details error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment details' }, { status: 500 })
  }
}

// POST /api/contractors/[id]/payment-details — a contractor's first detail becomes the default
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('contractors:sensitive')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const method = body.method
    const accountName = requiredText(body.accountName, 'accountName', 200)
    const accountNumber = requiredText(body.accountNumber, 'accountNumber', 100)
    const bankName = optionalText(body.bankName, 'bankName', 200) ?? null
    const isDefault = body.isDefault

    if (!isPaymentMethod(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    const contractor = await prisma.contractor.findUnique({ where: { id }, select: { id: true } })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    const detail = await prisma.$transaction(async (tx) => {
      const existing = await tx.contractorPaymentDetail.count({ where: { contractorId: id } })
      const makeDefault = existing === 0 || isDefault === true

      if (makeDefault) {
        await tx.contractorPaymentDetail.updateMany({
          where: { contractorId: id },
          data: { isDefault: false },
        })
      }

      const created = await tx.contractorPaymentDetail.create({
        data: {
          contractorId: id,
          method,
          accountName,
          accountNumber: encrypt(accountNumber),
          bankName,
          isDefault: makeDefault,
        },
      })

      await recordAudit(tx, session, {
        action: 'payment_detail.created',
        entityType: 'Contractor',
        entityId: id,
        metadata: { detailId: created.id, method, isDefault: makeDefault },
      })

      return created
    })

    return NextResponse.json(toMaskedDetail(detail), { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/contractors/[id]/payment-details error:', error)
    return NextResponse.json({ error: 'Failed to save payment detail' }, { status: 500 })
  }
}
