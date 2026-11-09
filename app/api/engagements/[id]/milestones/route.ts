import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CURRENCIES, MILESTONE_WHOLE_DIGITS, clientErrorResponse, enumValue, moneyAmount, readBody, requiredText } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/engagements/[id]/milestones — add a payable milestone
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const title = requiredText(body.title, 'title', 200)
    const amount = moneyAmount(body.amount, 'amount', MILESTONE_WHOLE_DIGITS)
    const currency = enumValue(body.currency, CURRENCIES, 'currency') ?? 'PHP'

    const engagement = await prisma.engagement.findUnique({ where: { id } })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    if (engagement.rateType !== 'PER_PROJECT' || engagement.projectPayMode !== 'MILESTONE') {
      return NextResponse.json(
        { error: 'This engagement is not paid by milestone' },
        { status: 400 }
      )
    }

    const milestone = await prisma.$transaction(async (tx) => {
      const created = await tx.milestone.create({
        data: { engagementId: id, title, amount, currency },
      })
      await recordAudit(tx, session, {
        action: 'milestone.created',
        entityType: 'Milestone',
        entityId: created.id,
        metadata: { engagementId: id, title, amount, currency },
      })
      return created
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/engagements/[id]/milestones error:', error)
    return NextResponse.json({ error: 'Failed to add milestone' }, { status: 500 })
  }
}
