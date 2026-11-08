import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizePortalApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Looks up by id and owner together, so another contractor's entry is a 404.
// Approved or payroll-linked entries need a manager to reopen them.
async function findEditable(id: string, contractorId: string) {
  const timesheet = await prisma.timesheet.findFirst({ where: { id, contractorId } })

  if (!timesheet) {
    return {
      timesheet: null,
      problem: NextResponse.json({ error: 'Timesheet not found' }, { status: 404 }),
    }
  }
  if (timesheet.payrollLineItemId || timesheet.status === 'APPROVED') {
    return {
      timesheet: null,
      problem: NextResponse.json(
        { error: 'This timesheet is already approved, so it can no longer be changed' },
        { status: 409 }
      ),
    }
  }

  return { timesheet, problem: null }
}

// PATCH /api/portal/timesheets/[id] — editing a rejected entry sends it back for approval
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizePortalApi()
    if (guard.error) return guard.error
    const { session, contractor } = guard

    const { id } = await params
    const { timesheet, problem } = await findEditable(id, contractor.id)
    if (problem) return problem

    const { date, hours, description } = await request.json()
    const parsedDate = date ? new Date(date) : undefined

    if (parsedDate && Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const parsedHours = hours === '' || hours === undefined ? null : hours

    if (parsedHours !== null && !(Number(parsedHours) > 0 && Number(parsedHours) <= 24)) {
      return NextResponse.json({ error: 'Hours must be between 0 and 24' }, { status: 400 })
    }

    const [updated] = await prisma.$transaction([
      prisma.timesheet.update({
        where: { id },
        data: {
          date: parsedDate,
          hours: parsedHours,
          description,
          ...(timesheet.status === 'REJECTED' && {
            status: 'SUBMITTED',
            rejectionReason: null,
            approvedBy: null,
            approvedAt: null,
          }),
        },
      }),
      recordAudit(prisma, session, {
        action: 'timesheet.updated',
        entityType: 'Timesheet',
        entityId: id,
        metadata: { date, hours: parsedHours, via: 'portal' },
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already have a timesheet for this engagement on this date' },
        { status: 409 }
      )
    }
    console.error('PATCH /api/portal/timesheets/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update timesheet' }, { status: 500 })
  }
}

// DELETE /api/portal/timesheets/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizePortalApi()
    if (guard.error) return guard.error
    const { session, contractor } = guard

    const { id } = await params
    const { problem } = await findEditable(id, contractor.id)
    if (problem) return problem

    await prisma.$transaction([
      prisma.timesheet.delete({ where: { id } }),
      recordAudit(prisma, session, {
        action: 'timesheet.deleted',
        entityType: 'Timesheet',
        entityId: id,
        metadata: { via: 'portal' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/portal/timesheets/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete timesheet' }, { status: 500 })
  }
}
