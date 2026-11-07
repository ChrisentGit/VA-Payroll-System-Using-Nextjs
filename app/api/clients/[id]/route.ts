import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/clients/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const { id } = await params
    const client = await prisma.client.findUnique({ where: { id } })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    const body = await request.json()
    const { name, email, contactPerson, billingCurrency, status, notes } = body

    const client = await prisma.client.update({
      where: { id },
      data: { name, email, contactPerson, billingCurrency, status, notes },
    })

    return NextResponse.json(client)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    console.error('PATCH /api/clients/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params

    const paidItems = await prisma.payrollLineItem.count({ where: { engagement: { clientId: id } } })
    if (paidItems > 0) {
      return NextResponse.json(
        { error: 'This client has payroll history, so it cannot be deleted' },
        { status: 409 }
      )
    }

    await prisma.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    console.error('DELETE /api/clients/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}