import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalHours, optionalText, readBody, requiredDate, requiredText } from '@/lib/validation'

// GET /api/timesheets — list all timesheets
export async function GET() {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error

    const timesheets = await prisma.timesheet.findMany({
      orderBy: { date: 'desc' },
      include: {
        contractor: true,
        engagement: { include: { client: true } },
      },
    })
    return NextResponse.json(timesheets)
  } catch (error) {
    console.error('GET /api/timesheets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheets' },
      { status: 500 }
    )
  }
}

// POST /api/timesheets — create a new timesheet entry
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const body = await readBody(request)
    const engagementId = requiredText(body.engagementId, 'engagementId')
    const date = requiredDate(body.date, 'date')
    const hours = optionalHours(body.hours) ?? null
    const description = optionalText(body.description, 'description')
    const status = body.status

    // Look up the engagement to get its contractorId (avoids trusting client input for this)
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const timesheet = await prisma.$transaction(async (tx) => {
      const created = await tx.timesheet.create({
        data: {
          engagementId,
          contractorId: engagement.contractorId,
          date,
          hours,
          description,
          status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
        },
        include: { contractor: true, engagement: { include: { client: true } } },
      })
      await recordAudit(tx, session, {
        action: 'timesheet.created',
        entityType: 'Timesheet',
        entityId: created.id,
        metadata: { engagementId, date: date.toISOString(), hours },
      })
      return created
    })

    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A timesheet already exists for this engagement on this date' },
        { status: 409 }
      )
    }
    console.error('POST /api/timesheets error:', error)
    return NextResponse.json(
      { error: 'Failed to create timesheet' },
      { status: 500 }
    )
  }
}