import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

// GET /api/engagements — list all engagements with related contractor/client/rates
export async function GET() {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const engagements = await prisma.engagement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: true,
        client: true,
        rates: { orderBy: { effectiveFrom: 'desc' } },
      },
    })
    return NextResponse.json(engagements)
  } catch (error) {
    console.error('GET /api/engagements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch engagements' },
      { status: 500 }
    )
  }
}

// POST /api/engagements — create engagement + its first rate together
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const body = await request.json()
    const {
      contractorId,
      clientId,
      title,
      rateType,
      retainerBasis,
      projectPayMode,
      status,
      startDate,
      endDate,
      rateAmount,
      rateCurrency,
      rateEffectiveFrom,
      rateNotes,
    } = body

    if (!contractorId || !clientId || !rateType || !rateAmount || !rateEffectiveFrom) {
      return NextResponse.json(
        {
          error:
            'contractorId, clientId, rateType, rateAmount, and rateEffectiveFrom are required',
        },
        { status: 400 }
      )
    }

    const engagement = await prisma.engagement.create({
      data: {
        contractorId,
        clientId,
        title: title || null,
        rateType,
        retainerBasis: retainerBasis || undefined,
        projectPayMode: projectPayMode || undefined,
        status: status || 'active',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        rates: {
          create: {
            amount: rateAmount,
            currency: rateCurrency || 'PHP',
            effectiveFrom: new Date(rateEffectiveFrom),
            notes: rateNotes || null,
          },
        },
      },
      include: { contractor: true, client: true, rates: true },
    })

    return NextResponse.json(engagement, { status: 201 })
  } catch (error) {
    console.error('POST /api/engagements error:', error)
    return NextResponse.json(
      { error: 'Failed to create engagement' },
      { status: 500 }
    )
  }
}