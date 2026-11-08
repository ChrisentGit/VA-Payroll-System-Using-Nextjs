import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { findRateOn } from '@/lib/payroll/calculate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/engagements/[id]/complete — marks a pay-on-completion project as done.
// Creates a single milestone at the rate in effect that day, which the next run pays.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date()

    if (Number.isNaN(completedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid completion date' }, { status: 400 })
    }

    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: { rates: true, milestones: { select: { id: true } } },
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    if (engagement.rateType !== 'PER_PROJECT' || engagement.projectPayMode !== 'ON_COMPLETION') {
      return NextResponse.json(
        { error: 'This engagement is not paid on completion' },
        { status: 400 }
      )
    }
    if (engagement.milestones.length > 0) {
      return NextResponse.json(
        { error: 'This project is already marked as complete' },
        { status: 409 }
      )
    }

    const rate = findRateOn(engagement.rates, completedAt)

    if (!rate) {
      return NextResponse.json(
        { error: 'No rate covers the completion date' },
        { status: 400 }
      )
    }

    const milestone = await prisma.$transaction(async (tx) => {
      const created = await tx.milestone.create({
        data: {
          engagementId: id,
          title: 'Project completion',
          amount: rate.amount,
          currency: rate.currency,
          completedAt,
        },
      })
      await recordAudit(tx, session, {
        action: 'engagement.completed',
        entityType: 'Engagement',
        entityId: id,
        metadata: { milestoneId: created.id, amount: rate.amount.toString(), currency: rate.currency },
      })
      return created
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error('POST /api/engagements/[id]/complete error:', error)
    return NextResponse.json(
      { error: 'Failed to mark project as complete' },
      { status: 500 }
    )
  }
}
