import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, readBody } from '@/lib/validation'
import { convertToPhp } from '@/lib/payroll/calculate'
import { PayrollError } from '@/lib/payroll/generate'
import { lockDraftRun } from '@/lib/payroll/locks'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/payroll-runs/[id]/exchange-rates
// Body: { rates: { USD: "56.10" } }, in PHP per 1 unit of the currency.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const { rates } = await readBody(request)

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'rates is required' }, { status: 400 })
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
      if (!rate.isFinite() || rate.lte(0) || rate.gte(1_000_000)) {
        return NextResponse.json(
          { error: `The rate for ${currency} must be between 0 and 1,000,000` },
          { status: 400 }
        )
      }
      parsed.set(currency, rate)
    }

    await prisma.$transaction(async (tx) => {
      const run = await lockDraftRun(tx, id, 'Exchange rates are locked once a run is finalized')

      for (const li of run.lineItems) {
        const rate = parsed.get(li.currency)
        if (!rate) continue

        await tx.payrollLineItem.update({
          where: { id: li.id },
          data: {
            exchangeRate: rate,
            totalAmountPhp: convertToPhp(li.totalAmount, rate),
          },
        })
      }

      await recordAudit(tx, session, {
        action: 'payroll.exchange_rates_set',
        entityType: 'PayrollRun',
        entityId: id,
        metadata: Object.fromEntries([...parsed].map(([c, r]) => [c, r.toString()])),
      })
    }, { timeout: 30_000 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    if (error instanceof PayrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('PATCH /api/payroll-runs/[id]/exchange-rates error:', error)
    return NextResponse.json(
      { error: 'Failed to save exchange rates' },
      { status: 500 }
    )
  }
}
