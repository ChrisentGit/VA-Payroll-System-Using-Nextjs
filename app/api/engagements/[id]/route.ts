import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/engagements/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const { id } = await params
    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: {
        contractor: true,
        client: true,
        rates: { orderBy: { effectiveFrom: 'desc' } },
      },
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    return NextResponse.json(engagement)
  } catch (error) {
    console.error('GET /api/engagements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch engagement' },
      { status: 500 }
    )
  }
}

// PATCH /api/engagements/[id] — updates engagement fields only (not rates)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    const body = await request.json()
    const { contractorId, clientId, title, rateType, status, startDate, endDate } = body

    const engagement = await prisma.engagement.update({
      where: { id },
      data: {
        contractorId,
        clientId,
        title,
        rateType,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: { contractor: true, client: true, rates: true },
    })

    return NextResponse.json(engagement)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    console.error('PATCH /api/engagements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update engagement' },
      { status: 500 }
    )
  }
}

// DELETE /api/engagements/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    await prisma.engagement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    console.error('DELETE /api/engagements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete engagement' },
      { status: 500 }
    )
  }
}