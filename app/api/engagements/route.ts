import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CURRENCIES, ENGAGEMENT_STATUSES, PROJECT_PAY_MODES, RATE_TYPES, RATE_WHOLE_DIGITS, RETAINER_BASES, clientErrorResponse, enumValue, moneyAmount, optionalDate, optionalText, readBody, requiredDate, requiredText } from '@/lib/validation'

// GET /api/engagements — list all engagements with related contractor/client/rates
export async function GET() {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const engagements = await prisma.engagement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: true,
        client: true,
        rates: { orderBy: { effectiveFrom: 'desc' } },
      },
    })
    return NextResponse.json(engagements)
  } catch (error) {
    console.error('GET /api/engagements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch engagements' },
      { status: 500 }
    )
  }
}

// POST /api/engagements — create engagement + its first rate together
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const body = await readBody(request)
    const contractorId = requiredText(body.contractorId, 'contractorId')
    const clientId = requiredText(body.clientId, 'clientId')
    const title = optionalText(body.title, 'title', 200)
    const rateType = enumValue(body.rateType, RATE_TYPES, 'rateType')
    const retainerBasis = enumValue(body.retainerBasis, RETAINER_BASES, 'retainerBasis')
    const projectPayMode = enumValue(body.projectPayMode, PROJECT_PAY_MODES, 'projectPayMode')
    const status = enumValue(body.status, ENGAGEMENT_STATUSES, 'status')
    const startDate = optionalDate(body.startDate, 'startDate')
    const endDate = optionalDate(body.endDate, 'endDate')
    const rateAmount = moneyAmount(body.rateAmount, 'rateAmount', RATE_WHOLE_DIGITS)
    const rateCurrency = enumValue(body.rateCurrency, CURRENCIES, 'rateCurrency') ?? 'PHP'
    const rateEffectiveFrom = requiredDate(body.rateEffectiveFrom, 'rateEffectiveFrom')
    const rateNotes = optionalText(body.rateNotes, 'rateNotes')

    if (!rateType) {
      return NextResponse.json({ error: 'rateType is required' }, { status: 400 })
    }

    const engagement = await prisma.$transaction(async (tx) => {
      const created = await tx.engagement.create({
        data: {
          contractorId,
          clientId,
          title,
          rateType,
          retainerBasis,
          projectPayMode,
          status: status ?? 'active',
          startDate: startDate ?? new Date(),
          endDate,
          rates: {
            create: {
              amount: rateAmount,
              currency: rateCurrency,
              effectiveFrom: rateEffectiveFrom,
              notes: rateNotes,
            },
          },
        },
        include: { contractor: true, client: true, rates: true },
      })
      await recordAudit(tx, session, {
        action: 'engagement.created',
        entityType: 'Engagement',
        entityId: created.id,
        metadata: { contractorId, clientId, rateType, rateAmount, rateCurrency },
      })
      return created
    })

    return NextResponse.json(engagement, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/engagements error:', error)
    return NextResponse.json(
      { error: 'Failed to create engagement' },
      { status: 500 }
    )
  }
}