import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

const IN_PAYROLL = 'This milestone is in a payroll run, so it can no longer be changed'

// PATCH /api/milestones/[id] — body { completed: boolean, completedAt?: string }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    const { completed, completedAt } = await request.json()

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

    const date = completedAt ? new Date(completedAt) : new Date()

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid completion date' }, { status: 400 })
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: { completedAt: completed ? date : null },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/milestones/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}

// DELETE /api/milestones/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

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

    await prisma.milestone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/milestones/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
  }
}
