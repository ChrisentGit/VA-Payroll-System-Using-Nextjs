import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizePortalApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'

// GET /api/portal/timesheets — the signed-in contractor's own entries
export async function GET() {
  try {
    const guard = await authorizePortalApi()
    if (guard.error) return guard.error

    const timesheets = await prisma.timesheet.findMany({
      where: { contractorId: guard.contractor.id },
      orderBy: { date: 'desc' },
      include: { engagement: { include: { client: { select: { name: true } } } } },
    })

    return NextResponse.json(timesheets)
  } catch (error) {
    console.error('GET /api/portal/timesheets error:', error)
    return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 })
  }
}

// POST /api/portal/timesheets — always saved as SUBMITTED, for a manager to approve
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizePortalApi()
    if (guard.error) return guard.error
    const { session, contractor } = guard

    if (contractor.status === 'OFFBOARDED') {
      return NextResponse.json(
        { error: 'Offboarded contractors cannot submit timesheets' },
        { status: 403 }
      )
    }

    const { engagementId, date, hours, description } = await request.json()
    const parsedDate = new Date(date)

    if (!engagementId || !date || Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'An engagement and a valid date are required' }, { status: 400 })
    }
    if (hours && !(Number(hours) > 0 && Number(hours) <= 24)) {
      return NextResponse.json({ error: 'Hours must be between 0 and 24' }, { status: 400 })
    }

    // Filtering on the contractor makes someone else's engagement look like it does not exist
    const engagement = await prisma.engagement.findFirst({
      where: { id: engagementId, contractorId: contractor.id, status: 'active' },
      select: { id: true },
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const timesheet = await prisma.$transaction(async (tx) => {
      const created = await tx.timesheet.create({
        data: {
          engagementId,
          contractorId: contractor.id,
          date: parsedDate,
          hours: hours || null,
          description: description || null,
          status: 'SUBMITTED',
        },
      })
      await recordAudit(tx, session, {
        action: 'timesheet.created',
        entityType: 'Timesheet',
        entityId: created.id,
        metadata: { engagementId, date, hours: hours || null, via: 'portal' },
      })
      return created
    })

    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already have a timesheet for this engagement on this date' },
        { status: 409 }
      )
    }
    console.error('POST /api/portal/timesheets error:', error)
    return NextResponse.json({ error: 'Failed to submit timesheet' }, { status: 500 })
  }
}
