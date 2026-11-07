import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

const IN_PAYROLL = 'This timesheet is in a payroll run, so it can no longer be changed'

// GET /api/timesheets/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: { contractor: true, engagement: { include: { client: true } } },
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    return NextResponse.json(timesheet)
  } catch (error) {
    console.error('GET /api/timesheets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet' },
      { status: 500 }
    )
  }
}

// PATCH /api/timesheets/[id] — edit an entry (not for approval — see /approve, /reject).
// Editing a rejected entry sends it back for approval.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const body = await request.json()
    const { date, hours, description } = body

    const existing = await prisma.timesheet.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    if (existing.payrollLineItemId) {
      return NextResponse.json({ error: IN_PAYROLL }, { status: 409 })
    }
    if (existing.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Reject this timesheet first to edit it' },
        { status: 409 }
      )
    }

    const parsedHours = hours === '' || hours === undefined ? null : hours

    if (parsedHours !== null && !(Number(parsedHours) > 0 && Number(parsedHours) <= 24)) {
      return NextResponse.json(
        { error: 'Hours must be between 0 and 24' },
        { status: 400 }
      )
    }

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        hours: parsedHours,
        description,
        ...(existing.status === 'REJECTED' && {
          status: 'SUBMITTED',
          rejectionReason: null,
          approvedBy: null,
          approvedAt: null,
        }),
      },
      include: { contractor: true, engagement: { include: { client: true } } },
    })

    return NextResponse.json(timesheet)
  } catch (error) {
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
    console.error('PATCH /api/timesheets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update timesheet' },
      { status: 500 }
    )
  }
}

// DELETE /api/timesheets/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const existing = await prisma.timesheet.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    if (existing.payrollLineItemId) {
      return NextResponse.json({ error: IN_PAYROLL }, { status: 409 })
    }

    await prisma.timesheet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/timesheets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete timesheet' },
      { status: 500 }
    )
  }
}
