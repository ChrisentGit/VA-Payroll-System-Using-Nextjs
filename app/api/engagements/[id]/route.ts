import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { ENGAGEMENT_STATUSES, PROJECT_PAY_MODES, RATE_TYPES, RETAINER_BASES, clientErrorResponse, enumValue, optionalDate, optionalText, readBody, textIfSent } from '@/lib/validation'

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
    const { session } = guard

    const { id } = await params
    const body = await readBody(request)
    const contractorId = textIfSent(body.contractorId, 'contractorId')
    const clientId = textIfSent(body.clientId, 'clientId')
    const title = optionalText(body.title, 'title', 200)
    const rateType = enumValue(body.rateType, RATE_TYPES, 'rateType')
    const retainerBasis = enumValue(body.retainerBasis, RETAINER_BASES, 'retainerBasis')
    const projectPayMode = enumValue(body.projectPayMode, PROJECT_PAY_MODES, 'projectPayMode')
    const status = enumValue(body.status, ENGAGEMENT_STATUSES, 'status')
    const startDate = optionalDate(body.startDate, 'startDate')
    const endDate = optionalDate(body.endDate, 'endDate')

    const [engagement] = await prisma.$transaction([
      prisma.engagement.update({
        where: { id },
        data: {
          contractorId,
          clientId,
          title,
          rateType,
          retainerBasis,
          projectPayMode,
          status,
          // The column is required, so a blank start date keeps the saved one
          startDate: startDate ?? undefined,
          endDate,
        },
        include: { contractor: true, client: true, rates: true },
      }),
      recordAudit(prisma, session, {
        action: 'engagement.updated',
        entityType: 'Engagement',
        entityId: id,
        metadata: { rateType, retainerBasis, projectPayMode, status },
      }),
    ])

    return NextResponse.json(engagement)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
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
    const { session } = guard

    const { id } = await params

    const paidItems = await prisma.payrollLineItem.count({ where: { engagementId: id } })
    if (paidItems > 0) {
      return NextResponse.json(
        { error: 'This engagement has payroll history, so it cannot be deleted' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.engagement.delete({ where: { id } }),
      recordAudit(prisma, session, {
        action: 'engagement.deleted',
        entityType: 'Engagement',
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
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    console.error('DELETE /api/engagements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete engagement' },
      { status: 500 }
    )
  }
}