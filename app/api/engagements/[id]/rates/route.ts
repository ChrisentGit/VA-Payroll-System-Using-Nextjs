import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CURRENCIES, RATE_WHOLE_DIGITS, clientErrorResponse, enumValue, moneyAmount, optionalText, readBody, requiredDate } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/engagements/[id]/rates — list rate history for an engagement
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const { id } = await params
    const rates = await prisma.rate.findMany({
      where: { engagementId: id },
      orderBy: { effectiveFrom: 'desc' },
    })
    return NextResponse.json(rates)
  } catch (error) {
    console.error('GET /api/engagements/[id]/rates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate history' },
      { status: 500 }
    )
  }
}

// POST /api/engagements/[id]/rates — add a new rate version
// Automatically closes out the current active rate (sets its effectiveTo)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const amount = moneyAmount(body.amount, 'amount', RATE_WHOLE_DIGITS)
    const currency = enumValue(body.currency, CURRENCIES, 'currency') ?? 'PHP'
    const newEffectiveFrom = requiredDate(body.effectiveFrom, 'effectiveFrom')
    const notes = optionalText(body.notes, 'notes')

    const engagement = await prisma.engagement.findUnique({ where: { id } })
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Find the currently "open" rate (no effectiveTo yet) for this engagement
    const currentRate = await prisma.rate.findFirst({
      where: { engagementId: id, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (currentRate && newEffectiveFrom <= currentRate.effectiveFrom) {
      return NextResponse.json(
        { error: 'The new rate must start after the current rate does' },
        { status: 400 }
      )
    }

    // Both writes share a transaction so the rate timeline can never be left
    // half updated (a new rate added but the old one still open)
    const newRate = await prisma.$transaction(async (tx) => {
      if (currentRate) {
        await tx.rate.update({
          where: { id: currentRate.id },
          data: { effectiveTo: newEffectiveFrom },
        })
      }

      const created = await tx.rate.create({
        data: {
          engagementId: id,
          amount,
          currency,
          effectiveFrom: newEffectiveFrom,
          notes,
        },
      })
      await recordAudit(tx, session, {
        action: 'rate.created',
        entityType: 'Engagement',
        entityId: id,
        metadata: { amount, currency, effectiveFrom: newEffectiveFrom.toISOString() },
      })
      return created
    })

    return NextResponse.json(newRate, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/engagements/[id]/rates error:', error)
    return NextResponse.json(
      { error: 'Failed to add new rate' },
      { status: 500 }
    )
  }
}
