import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalDate, readBody } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

const IN_PAYROLL = 'This milestone is in a payroll run, so it can no longer be changed'

// PATCH /api/milestones/[id] — body { completed: boolean, completedAt?: string }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const completed = body.completed

    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be true or false' }, { status: 400 })
    }

    const date = optionalDate(body.completedAt, 'completedAt') ?? new Date()

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { lineItem: { select: { id: true } } },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }
    if (milestone.lineItem) {
      return NextResponse.json({ error: IN_PAYROLL }, { status: 409 })
    }

    const [updated] = await prisma.$transaction([
      prisma.milestone.update({
        where: { id },
        data: { completedAt: completed ? date : null },
      }),
      recordAudit(prisma, session, {
        action: completed ? 'milestone.completed' : 'milestone.reopened',
        entityType: 'Milestone',
        entityId: id,
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('PATCH /api/milestones/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}

// DELETE /api/milestones/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { lineItem: { select: { id: true } } },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }
    if (milestone.lineItem) {
      return NextResponse.json({ error: IN_PAYROLL }, { status: 409 })
    }

    await prisma.$transaction([
      prisma.milestone.delete({ where: { id } }),
      recordAudit(prisma, session, {
        action: 'milestone.deleted',
        entityType: 'Milestone',
        entityId: id,
      }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/milestones/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
  }
}
