import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/contractors — list all contractors
export async function GET() {
  try {
    const contractors = await prisma.contractor.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(contractors)
  } catch (error) {
    console.error('GET /api/contractors error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractors' },
      { status: 500 }
    )
  }
}

// POST /api/contractors — create a new contractor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, taxId, status, startDate, endDate, notes } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email are required' },
        { status: 400 }
      )
    }

    const contractor = await prisma.contractor.create({
      data: {
        name,
        email,
        phone: phone || null,
        taxId: taxId || null,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json(contractor, { status: 201 })
  } catch (error) {
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
    console.error('POST /api/contractors error:', error)
    return NextResponse.json(
      { error: 'Failed to create contractor' },
      { status: 500 }
    )
  }
}