import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/engagements/[id]/rates — list rate history for an engagement
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:read')
    if (guard.error) return guard.error

    const { id } = await params
    const rates = await prisma.rate.findMany({
      where: { engagementId: id },
      orderBy: { effectiveFrom: 'desc' },
    })
    return NextResponse.json(rates)
  } catch (error) {
    console.error('GET /api/engagements/[id]/rates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate history' },
      { status: 500 }
    )
  }
}

// POST /api/engagements/[id]/rates — add a new rate version
// Automatically closes out the current active rate (sets its effectiveTo)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('directory:write')
    if (guard.error) return guard.error

    const { id } = await params
    const body = await request.json()
    const { amount, currency, effectiveFrom, notes } = body

    if (!amount || !effectiveFrom) {
      return NextResponse.json(
        { error: 'amount and effectiveFrom are required' },
        { status: 400 }
      )
    }

    const newEffectiveFrom = new Date(effectiveFrom)

    // Find the currently "open" rate (no effectiveTo yet) for this engagement
    const currentRate = await prisma.rate.findFirst({
      where: { engagementId: id, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    })

    // Run both writes in a transaction so we never end up with an inconsistent
    // rate timeline (e.g. new rate created but old one never closed out)
    const [, newRate] = await prisma.$transaction([
      ...(currentRate
        ? [
            prisma.rate.update({
              where: { id: currentRate.id },
              data: { effectiveTo: newEffectiveFrom },
            }),
          ]
        : []),
      prisma.rate.create({
        data: {
          engagementId: id,
          amount,
          currency: currency || 'PHP',
          effectiveFrom: newEffectiveFrom,
          notes: notes || null,
        },
      }),
    ])

    return NextResponse.json(newRate, { status: 201 })
  } catch (error) {
    console.error('POST /api/engagements/[id]/rates error:', error)
    return NextResponse.json(
      { error: 'Failed to add new rate' },
      { status: 500 }
    )
  }
}