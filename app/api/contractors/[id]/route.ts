import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { can } from '@/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/contractors/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const { id } = await params
    const contractor = await prisma.contractor.findUnique({
      where: { id },
      omit: { taxId: !can(guard.session.user.role, 'contractors:sensitive') },
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    return NextResponse.json(contractor)
  } catch (error) {
    console.error('GET /api/contractors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractor' },
      { status: 500 }
    )
  }
}

// PATCH /api/contractors/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    const body = await request.json()
    const { name, email, phone, taxId, status, startDate, endDate, notes } = body

    const contractor = await prisma.contractor.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        taxId,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes,
      },
    })

    return NextResponse.json(contractor)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const meta = 'meta' in error ? (error.meta as { target?: string[] }) : undefined
      const field = meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `A contractor with this ${field} already exists` },
        { status: 409 }
      )
    }
    console.error('PATCH /api/contractors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update contractor' },
      { status: 500 }
    )
  }
}

// DELETE /api/contractors/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    await prisma.contractor.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }
    console.error('DELETE /api/contractors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contractor' },
      { status: 500 }
    )
  }
}