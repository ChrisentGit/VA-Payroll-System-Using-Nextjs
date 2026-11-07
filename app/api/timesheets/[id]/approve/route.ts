import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/timesheets/[id]/approve
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const existing = await prisma.timesheet.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    if (existing.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Only submitted timesheets can be approved' },
        { status: 409 }
      )
    }

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.name || session.user.email || 'Unknown',
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: { contractor: true, engagement: { include: { client: true } } },
    })

    return NextResponse.json(timesheet)
  } catch (error) {
    console.error('POST /api/timesheets/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve timesheet' },
      { status: 500 }
    )
  }
}
