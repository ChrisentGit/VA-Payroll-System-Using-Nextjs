import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { convertToPhp } from '@/lib/payroll/calculate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/payroll-runs/[id]/exchange-rates
// Body: { rates: { USD: "56.10" } }, in PHP per 1 unit of the currency.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const { rates } = await request.json()

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'rates is required' }, { status: 400 })
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { lineItems: true },
    })

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Exchange rates are locked once a run is finalized' },
        { status: 409 }
      )
    }

    const parsed = new Map<string, Prisma.Decimal>()

    for (const [currency, value] of Object.entries(rates)) {
      if (currency === 'PHP') continue

      let rate: Prisma.Decimal
      try {
        rate = new Prisma.Decimal(String(value))
      } catch {
        return NextResponse.json({ error: `Invalid rate for ${currency}` }, { status: 400 })
      }
      if (!rate.isFinite() || rate.lte(0)) {
        return NextResponse.json(
          { error: `The rate for ${currency} must be greater than zero` },
          { status: 400 }
        )
      }
      parsed.set(currency, rate)
    }

    await prisma.$transaction(
      run.lineItems
        .filter((li) => parsed.has(li.currency))
        .map((li) => {
          const rate = parsed.get(li.currency) as Prisma.Decimal
          return prisma.payrollLineItem.update({
            where: { id: li.id },
            data: {
              exchangeRate: rate,
              totalAmountPhp: convertToPhp(li.totalAmount, rate),
            },
          })
        })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/payroll-runs/[id]/exchange-rates error:', error)
    return NextResponse.json(
      { error: 'Failed to save exchange rates' },
      { status: 500 }
    )
  }
}
