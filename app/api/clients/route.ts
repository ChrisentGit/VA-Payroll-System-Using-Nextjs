import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clients — list all clients
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error('GET /api/clients error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients — create a new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, contactPerson, billingCurrency, status, notes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        contactPerson: contactPerson || null,
        billingCurrency: billingCurrency || 'PHP',
        status: status || 'ACTIVE',
        notes: notes || null,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('POST /api/clients error:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}