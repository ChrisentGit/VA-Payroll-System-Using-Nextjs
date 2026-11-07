import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/payroll-periods/[id]/generate-run
// Scans approved timesheets (hourly) and active engagements (retainer/per-project)
// within the period's date range, and builds a draft PayrollRun with line items.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: periodId } = await params

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } })
    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    // Create the run first (DRAFT by default)
    const run = await prisma.payrollRun.create({
      data: { payrollPeriodId: periodId },
    })

    const lineItemsToCreate: Prisma.PayrollLineItemCreateManyInput[] = []

    // --- HOURLY engagements: sum approved timesheet hours in range ---
    const hourlyEngagements = await prisma.engagement.findMany({
      where: { rateType: 'HOURLY' },
      include: {
        rates: { orderBy: { effectiveFrom: 'asc' } },
        timesheets: {
          where: {
            status: 'APPROVED',
            date: { gte: period.startDate, lte: period.endDate },
          },
        },
      },
    })

    for (const engagement of hourlyEngagements) {
      if (engagement.timesheets.length === 0) continue

      let totalHours = 0
      let totalAmount = 0
      const ratesUsed = new Set<string>()
      let currency = engagement.rates[0]?.currency || 'PHP'

      for (const ts of engagement.timesheets) {
        const hours = ts.hours ? Number(ts.hours) : 0
        if (hours === 0) continue

        // Find the rate that was active on this specific timesheet's date
        const applicableRate = engagement.rates.find((r) => {
          const from = r.effectiveFrom
          const to = r.effectiveTo
          return ts.date >= from && (!to || ts.date < to)
        })

        if (!applicableRate) continue // no rate covers this date — skip, can't bill it

        totalHours += hours
        totalAmount += hours * Number(applicableRate.amount)
        ratesUsed.add(applicableRate.amount.toString())
        currency = applicableRate.currency
      }

      if (totalHours === 0) continue

      const blendedRate = totalAmount / totalHours

      lineItemsToCreate.push({
        payrollRunId: run.id,
        engagementId: engagement.id,
        contractorId: engagement.contractorId,
        rateType: 'HOURLY',
        hours: totalHours,
        rateAmount: blendedRate,
        currency,
        totalAmount,
        notes:
          ratesUsed.size > 1
            ? `Blended rate across ${ratesUsed.size} rate changes during this period`
            : null,
      })
    }

    // --- RETAINER / PER_PROJECT engagements: charge current active rate if engagement overlaps period ---
    const flatEngagements = await prisma.engagement.findMany({
      where: {
        rateType: { in: ['RETAINER', 'PER_PROJECT'] },
        status: 'active',
        startDate: { lte: period.endDate },
        OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
      },
      include: {
        rates: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    })

    for (const engagement of flatEngagements) {
      const currentRate = engagement.rates[0]
      if (!currentRate) continue // no active rate on file — skip

      lineItemsToCreate.push({
        payrollRunId: run.id,
        engagementId: engagement.id,
        contractorId: engagement.contractorId,
        rateType: engagement.rateType,
        hours: null,
        rateAmount: currentRate.amount,
        currency: currentRate.currency,
        totalAmount: currentRate.amount,
        notes: `Full-period ${engagement.rateType.toLowerCase().replace('_', ' ')} charge`,
      })
    }

    if (lineItemsToCreate.length > 0) {
      await prisma.payrollLineItem.createMany({ data: lineItemsToCreate })
    }

    const fullRun = await prisma.payrollRun.findUnique({
      where: { id: run.id },
      include: {
        lineItems: { include: { contractor: true, engagement: { include: { client: true } } } },
      },
    })

    return NextResponse.json(fullRun, { status: 201 })
  } catch (error) {
    console.error('POST /api/payroll-periods/[id]/generate-run error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payroll run' },
      { status: 500 }
    )
  }
}