import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CONTRACTOR_STATUSES, clientErrorResponse, enumValue, optionalDate, optionalText, readBody, requiredText } from '@/lib/validation'
import { encryptIfPresent } from '@/lib/crypto'

// GET /api/contractors — list all contractors
export async function GET() {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

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
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error
    const { session } = guard

    const body = await readBody(request)
    const name = requiredText(body.name, 'name', 200)
    const email = requiredText(body.email, 'email', 254)
    const phone = optionalText(body.phone, 'phone', 50)
    const taxId = optionalText(body.taxId, 'taxId', 100)
    const status = enumValue(body.status, CONTRACTOR_STATUSES, 'status')
    const startDate = optionalDate(body.startDate, 'startDate')
    const endDate = optionalDate(body.endDate, 'endDate')
    const notes = optionalText(body.notes, 'notes')

    const contractor = await prisma.$transaction(async (tx) => {
      const created = await tx.contractor.create({
        data: {
          name,
          email,
          phone,
          taxId: encryptIfPresent(taxId),
          status: status ?? 'ACTIVE',
          startDate,
          endDate,
          notes,
        },
      })
      await recordAudit(tx, session, {
        action: 'contractor.created',
        entityType: 'Contractor',
        entityId: created.id,
        metadata: { name },
      })
      return created
    })

    return NextResponse.json(contractor, { status: 201 })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
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