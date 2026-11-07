import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/timesheets/[id]/reject
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('timesheets:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const body = await request.json()
    const { rejectionReason } = body

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'rejectionReason is required' },
        { status: 400 }
      )
    }

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: session.user.name || session.user.email || 'Unknown',
        approvedAt: new Date(),
        rejectionReason,
      },
      include: { contractor: true, engagement: { include: { client: true } } },
    })

    return NextResponse.json(timesheet)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    console.error('POST /api/timesheets/[id]/reject error:', error)
    return NextResponse.json(
      { error: 'Failed to reject timesheet' },
      { status: 500 }
    )
  }
}