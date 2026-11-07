import { Prisma } from '@prisma/client'
import type { Currency, PayFrequency, RateType, RetainerBasis } from '@prisma/client'

// Pure pay calculations: no database access, so every rule here can be unit tested.
// All money math uses Decimal. Dates are compared as whole UTC days.

const Decimal = Prisma.Decimal
type Decimal = Prisma.Decimal
type Numeric = Decimal | string | number

const DAY_MS = 86_400_000
const toDay = (date: Date) => Math.floor(date.getTime() / DAY_MS)
const formatDay = (date: Date) => date.toISOString().slice(0, 10)
const roundMoney = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

const PERIODS_PER_MONTH: Record<PayFrequency, number> = {
  MONTHLY: 1,
  SEMI_MONTHLY: 2,
}

export interface PeriodInput {
  startDate: Date
  endDate: Date
  frequency: PayFrequency
}

export interface RateInput {
  id: string
  amount: Numeric
  currency: Currency
  // Inclusive
  effectiveFrom: Date
  // Exclusive: the day the next rate takes over
  effectiveTo: Date | null
}

export interface EngagementRef {
  id: string
  contractorId: string
  label: string
}

export interface TimesheetInput {
  id: string
  date: Date
  hours: Numeric | null
}

export interface MilestoneInput {
  id: string
  title: string
  amount: Numeric
  currency: Currency
}

export interface DraftLineItem {
  engagementId: string
  contractorId: string
  rateType: RateType
  hours: Decimal | null
  rateAmount: Decimal
  currency: Currency
  totalAmount: Decimal
  notes: string | null
  timesheetIds: string[]
  milestoneId: string | null
}

export interface CalculationResult {
  items: DraftLineItem[]
  warnings: string[]
}

export function findRateOn(rates: RateInput[], date: Date): RateInput | undefined {
  const day = toDay(date)
  return rates
    .filter(
      (rate) =>
        toDay(rate.effectiveFrom) <= day &&
        (!rate.effectiveTo || day < toDay(rate.effectiveTo))
    )
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0]
}

// One line item per rate, so hours x rate always equals the total shown and
// a mid-period change of rate or currency is never blended together.
export function calculateHourly(
  engagement: EngagementRef,
  rates: RateInput[],
  timesheets: TimesheetInput[],
  period: PeriodInput
): CalculationResult {
  const warnings: string[] = []
  const groups = new Map<string, { rate: RateInput; timesheets: TimesheetInput[] }>()

  for (const timesheet of timesheets) {
    const day = formatDay(timesheet.date)

    if (timesheet.hours === null || new Decimal(timesheet.hours).isZero()) {
      warnings.push(`${engagement.label}: timesheet on ${day} has no hours, so it was not paid.`)
      continue
    }

    const rate = findRateOn(rates, timesheet.date)
    if (!rate) {
      warnings.push(`${engagement.label}: no rate covers ${day}, so that timesheet was not paid.`)
      continue
    }

    const group = groups.get(rate.id) ?? { rate, timesheets: [] }
    group.timesheets.push(timesheet)
    groups.set(rate.id, group)
  }

  const periodStart = toDay(period.startDate)
  const items = [...groups.values()]
    .sort((a, b) => a.rate.effectiveFrom.getTime() - b.rate.effectiveFrom.getTime())
    .map(({ rate, timesheets: group }) => {
      const hours = group.reduce((sum, t) => sum.plus(t.hours as Numeric), new Decimal(0))
      const earlier = group.filter((t) => toDay(t.date) < periodStart).length

      return {
        engagementId: engagement.id,
        contractorId: engagement.contractorId,
        rateType: 'HOURLY' as const,
        hours,
        rateAmount: new Decimal(rate.amount),
        currency: rate.currency,
        totalAmount: roundMoney(hours.times(rate.amount)),
        notes: earlier > 0 ? `Includes ${earlier} timesheet(s) from before this period` : null,
        timesheetIds: group.map((t) => t.id),
        milestoneId: null,
      }
    })

  return { items, warnings }
}

// Pays each rate for the days it covers within both the period and the engagement.
// A PER_MONTH retainer is first divided by the number of pay periods in a month.
export function calculateRetainer(
  engagement: EngagementRef & {
    startDate: Date
    endDate: Date | null
    retainerBasis: RetainerBasis
  },
  rates: RateInput[],
  period: PeriodInput
): CalculationResult {
  const periodStart = toDay(period.startDate)
  const periodEnd = toDay(period.endDate)
  const firstDay = Math.max(periodStart, toDay(engagement.startDate))
  const lastDay = engagement.endDate
    ? Math.min(periodEnd, toDay(engagement.endDate))
    : periodEnd

  if (firstDay > lastDay) return { items: [], warnings: [] }

  const periodDays = periodEnd - periodStart + 1
  const activeDays = lastDay - firstDay + 1
  const divisor =
    engagement.retainerBasis === 'PER_MONTH' ? PERIODS_PER_MONTH[period.frequency] : 1

  const items: DraftLineItem[] = []
  let coveredDays = 0

  const ordered = [...rates].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime()
  )

  for (const rate of ordered) {
    const segmentStart = Math.max(firstDay, toDay(rate.effectiveFrom))
    const segmentEnd = rate.effectiveTo
      ? Math.min(lastDay, toDay(rate.effectiveTo) - 1)
      : lastDay

    if (segmentStart > segmentEnd) continue

    const days = segmentEnd - segmentStart + 1
    coveredDays += days

    const notes: string[] = []
    if (divisor > 1) notes.push(`Monthly retainer split across ${divisor} pay periods`)
    if (days < periodDays) notes.push(`Prorated for ${days} of ${periodDays} days`)

    items.push({
      engagementId: engagement.id,
      contractorId: engagement.contractorId,
      rateType: 'RETAINER',
      hours: null,
      rateAmount: new Decimal(rate.amount),
      currency: rate.currency,
      totalAmount: roundMoney(
        new Decimal(rate.amount).times(days).dividedBy(divisor * periodDays)
      ),
      notes: notes.length > 0 ? notes.join('; ') : null,
      timesheetIds: [],
      milestoneId: null,
    })
  }

  const warnings: string[] = []
  if (coveredDays < activeDays) {
    warnings.push(
      `${engagement.label}: ${activeDays - coveredDays} day(s) have no rate, so they were not paid.`
    )
  }

  return { items, warnings }
}

// Expects milestones that are completed and not yet paid. Each is paid exactly once.
export function calculateMilestones(
  engagement: EngagementRef,
  milestones: MilestoneInput[]
): CalculationResult {
  return {
    warnings: [],
    items: milestones.map((milestone) => ({
      engagementId: engagement.id,
      contractorId: engagement.contractorId,
      rateType: 'PER_PROJECT',
      hours: null,
      rateAmount: new Decimal(milestone.amount),
      currency: milestone.currency,
      totalAmount: roundMoney(new Decimal(milestone.amount)),
      notes: milestone.title,
      timesheetIds: [],
      milestoneId: milestone.id,
    })),
  }
}

export function convertToPhp(amount: Numeric, exchangeRate: Numeric): Decimal {
  return roundMoney(new Decimal(amount).times(exchangeRate))
}
