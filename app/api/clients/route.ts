import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CLIENT_STATUSES, CURRENCIES, clientErrorResponse, enumValue, optionalText, readBody, requiredText } from '@/lib/validation'

// GET /api/clients — list all clients
export async function GET() {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

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
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const body = await readBody(request)
    const name = requiredText(body.name, 'name', 200)
    const email = optionalText(body.email, 'email', 254)
    const contactPerson = optionalText(body.contactPerson, 'contactPerson', 200)
    const billingCurrency = enumValue(body.billingCurrency, CURRENCIES, 'billingCurrency')
    const status = enumValue(body.status, CLIENT_STATUSES, 'status')
    const notes = optionalText(body.notes, 'notes')

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          name,
          email,
          contactPerson,
          billingCurrency: billingCurrency ?? 'PHP',
          status: status ?? 'ACTIVE',
          notes,
        },
      })
      await recordAudit(tx, session, {
        action: 'client.created',
        entityType: 'Client',
        entityId: created.id,
        metadata: { name },
      })
      return created
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/clients error:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}