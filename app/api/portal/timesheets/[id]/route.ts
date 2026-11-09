import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizePortalApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalDate, optionalHours, optionalText, readBody } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Looks up by id and owner together, so another contractor's entry is a 404.
// Approved or payroll-linked entries need a manager to reopen them.
async function findEditable(id: string, contractor: { id: string; status: string }) {
  if (contractor.status === 'OFFBOARDED') {
    return {
      timesheet: null,
      problem: NextResponse.json(
        { error: 'Offboarded contractors cannot change timesheets' },
        { status: 403 }
      ),
    }
  }

  const timesheet = await prisma.timesheet.findFirst({ where: { id, contractorId: contractor.id } })

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
    const { timesheet, problem } = await findEditable(id, contractor)
    if (problem) return problem

    const body = await readBody(request)
    const date = optionalDate(body.date, 'date') ?? undefined
    const hours = optionalHours(body.hours)
    const description = optionalText(body.description, 'description')

    const [updated] = await prisma.$transaction([
      prisma.timesheet.update({
        where: { id },
        data: {
          date,
          hours,
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
        metadata: { date: date?.toISOString(), hours, via: 'portal' },
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
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
    const { problem } = await findEditable(id, contractor)
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
