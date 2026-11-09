import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { CONTRACTOR_STATUSES, clientErrorResponse, enumValue, optionalDate, optionalText, readBody, textIfSent } from '@/lib/validation'
import { encryptIfPresent } from '@/lib/crypto'
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
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const name = textIfSent(body.name, 'name', 200)
    const email = textIfSent(body.email, 'email', 254)
    const phone = optionalText(body.phone, 'phone', 50)
    const taxId = optionalText(body.taxId, 'taxId', 100)
    const status = enumValue(body.status, CONTRACTOR_STATUSES, 'status')
    const startDate = optionalDate(body.startDate, 'startDate')
    const endDate = optionalDate(body.endDate, 'endDate')
    const notes = optionalText(body.notes, 'notes')

    const [contractor] = await prisma.$transaction([
      prisma.contractor.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          taxId: taxId === undefined ? undefined : encryptIfPresent(taxId),
          status,
          startDate,
          endDate,
          notes,
        },
      }),
      recordAudit(prisma, session, {
        action: 'contractor.updated',
        entityType: 'Contractor',
        entityId: id,
        metadata: { name, status },
      }),
    ])

    return NextResponse.json(contractor)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
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
    const { session } = guard

    const { id } = await params

    const paidItems = await prisma.payrollLineItem.count({ where: { contractorId: id } })
    if (paidItems > 0) {
      return NextResponse.json(
        { error: 'This contractor has payroll history, so it cannot be deleted' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.contractor.delete({ where: { id } }),
      recordAudit(prisma, session, {
        action: 'contractor.deleted',
        entityType: 'Contractor',
        entityId: id,
      }),
    ])
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