import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/timesheets/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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

// PATCH /api/timesheets/[id] — edit a draft/submitted entry (not for approval — see /approve, /reject)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, hours, description } = body

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        hours: hours ?? null,
        description,
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
    const { id } = await params
    await prisma.timesheet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    console.error('DELETE /api/timesheets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete timesheet' },
      { status: 500 }
    )
  }
}