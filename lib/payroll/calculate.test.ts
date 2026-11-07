import { describe, expect, it } from 'vitest'
import {
  calculateHourly,
  calculateMilestones,
  calculateRetainer,
  convertToPhp,
  findRateOn,
  type PeriodInput,
  type RateInput,
} from './calculate'

const day = (value: string) => new Date(`${value}T00:00:00.000Z`)

const engagement = { id: 'e1', contractorId: 'c1', label: 'Ana (Acme)' }

const period = (
  start: string,
  end: string,
  frequency: PeriodInput['frequency'] = 'MONTHLY'
): PeriodInput => ({ startDate: day(start), endDate: day(end), frequency })

const rate = (
  id: string,
  amount: string,
  from: string,
  to: string | null = null,
  currency: RateInput['currency'] = 'PHP'
): RateInput => ({
  id,
  amount,
  currency,
  effectiveFrom: day(from),
  effectiveTo: to ? day(to) : null,
})

const retainer = (
  overrides: Partial<Parameters<typeof calculateRetainer>[0]> = {}
) => ({
  ...engagement,
  startDate: day('2026-01-01'),
  endDate: null,
  retainerBasis: 'PER_MONTH' as const,
  ...overrides,
})

describe('findRateOn', () => {
  const rates = [rate('old', '100', '2026-01-01', '2026-01-16'), rate('new', '120', '2026-01-16')]

  it('treats effectiveFrom as inclusive', () => {
    expect(findRateOn(rates, day('2026-01-16'))?.id).toBe('new')
  })

  it('treats effectiveTo as exclusive', () => {
    expect(findRateOn(rates, day('2026-01-15'))?.id).toBe('old')
  })

  it('finds nothing before the first rate', () => {
    expect(findRateOn(rates, day('2025-12-31'))).toBeUndefined()
  })
})

describe('calculateHourly', () => {
  const jan = period('2026-01-01', '2026-01-31')

  it('multiplies hours by the rate', () => {
    const { items } = calculateHourly(
      engagement,
      [rate('r1', '100', '2026-01-01')],
      [
        { id: 't1', date: day('2026-01-05'), hours: '8' },
        { id: 't2', date: day('2026-01-06'), hours: '4.5' },
      ],
      jan
    )

    expect(items).toHaveLength(1)
    expect(items[0].hours?.toString()).toBe('12.5')
    expect(items[0].totalAmount.toString()).toBe('1250')
    expect(items[0].timesheetIds).toEqual(['t1', 't2'])
  })

  it('avoids floating point errors', () => {
    const { items } = calculateHourly(
      engagement,
      [rate('r1', '0.1', '2026-01-01')],
      [
        { id: 't1', date: day('2026-01-05'), hours: '0.1' },
        { id: 't2', date: day('2026-01-06'), hours: '0.2' },
      ],
      jan
    )

    expect(items[0].hours?.toString()).toBe('0.3')
  })

  it('splits a mid-period rate change into one item per rate', () => {
    const { items } = calculateHourly(
      engagement,
      [rate('old', '100', '2026-01-01', '2026-01-16'), rate('new', '120', '2026-01-16')],
      [
        { id: 't1', date: day('2026-01-15'), hours: '10' },
        { id: 't2', date: day('2026-01-16'), hours: '10' },
      ],
      jan
    )

    expect(items.map((i) => i.totalAmount.toString())).toEqual(['1000', '1200'])
    expect(items.map((i) => i.timesheetIds)).toEqual([['t1'], ['t2']])
  })

  it('keeps different currencies on separate items', () => {
    const { items } = calculateHourly(
      engagement,
      [
        rate('php', '500', '2026-01-01', '2026-01-16', 'PHP'),
        rate('usd', '10', '2026-01-16', null, 'USD'),
      ],
      [
        { id: 't1', date: day('2026-01-10'), hours: '2' },
        { id: 't2', date: day('2026-01-20'), hours: '2' },
      ],
      jan
    )

    expect(items.map((i) => `${i.currency} ${i.totalAmount}`)).toEqual(['PHP 1000', 'USD 20'])
  })

  it('warns instead of silently skipping a date with no rate', () => {
    const { items, warnings } = calculateHourly(
      engagement,
      [rate('r1', '100', '2026-01-10')],
      [{ id: 't1', date: day('2026-01-05'), hours: '8' }],
      jan
    )

    expect(items).toHaveLength(0)
    expect(warnings).toEqual(['Ana (Acme): no rate covers 2026-01-05, so that timesheet was not paid.'])
  })

  it('warns about a timesheet with no hours', () => {
    const { items, warnings } = calculateHourly(
      engagement,
      [rate('r1', '100', '2026-01-01')],
      [{ id: 't1', date: day('2026-01-05'), hours: null }],
      jan
    )

    expect(items).toHaveLength(0)
    expect(warnings[0]).toContain('has no hours')
  })

  it('pays late approvals at the rate of the day worked and notes them', () => {
    const { items } = calculateHourly(
      engagement,
      [rate('old', '100', '2025-12-01', '2026-01-01'), rate('new', '200', '2026-01-01')],
      [{ id: 't1', date: day('2025-12-20'), hours: '5' }],
      jan
    )

    expect(items[0].totalAmount.toString()).toBe('500')
    expect(items[0].notes).toBe('Includes 1 timesheet(s) from before this period')
  })
})

describe('calculateRetainer', () => {
  it('pays a monthly retainer in full on a monthly schedule', () => {
    const { items } = calculateRetainer(
      retainer(),
      [rate('r1', '30000', '2026-01-01')],
      period('2026-01-01', '2026-01-31')
    )

    expect(items[0].totalAmount.toString()).toBe('30000')
    expect(items[0].notes).toBeNull()
  })

  it('splits a monthly retainer on a twice-monthly schedule', () => {
    const { items } = calculateRetainer(
      retainer(),
      [rate('r1', '30000', '2026-01-01')],
      period('2026-01-01', '2026-01-15', 'SEMI_MONTHLY')
    )

    expect(items[0].totalAmount.toString()).toBe('15000')
    expect(items[0].notes).toBe('Monthly retainer split across 2 pay periods')
  })

  it('pays a per-period retainer in full on a twice-monthly schedule', () => {
    const { items } = calculateRetainer(
      retainer({ retainerBasis: 'PER_PERIOD' }),
      [rate('r1', '15000', '2026-01-01')],
      period('2026-01-01', '2026-01-15', 'SEMI_MONTHLY')
    )

    expect(items[0].totalAmount.toString()).toBe('15000')
  })

  it('prorates when the engagement starts mid-period', () => {
    const { items } = calculateRetainer(
      retainer({ startDate: day('2026-01-11') }),
      [rate('r1', '31000', '2026-01-01')],
      period('2026-01-01', '2026-01-31')
    )

    expect(items[0].totalAmount.toString()).toBe('21000')
    expect(items[0].notes).toBe('Prorated for 21 of 31 days')
  })

  it('prorates when the engagement ends mid-period, counting the last day', () => {
    const { items } = calculateRetainer(
      retainer({ endDate: day('2026-01-10') }),
      [rate('r1', '31000', '2026-01-01')],
      period('2026-01-01', '2026-01-31')
    )

    expect(items[0].totalAmount.toString()).toBe('10000')
  })

  it('uses the rate from the period, not the latest rate', () => {
    const { items } = calculateRetainer(
      retainer(),
      [rate('old', '10000', '2026-01-01', '2026-03-01'), rate('new', '99999', '2026-03-01')],
      period('2026-01-01', '2026-01-31')
    )

    expect(items).toHaveLength(1)
    expect(items[0].totalAmount.toString()).toBe('10000')
  })

  it('splits a mid-period rate change by days', () => {
    const { items } = calculateRetainer(
      retainer(),
      [rate('old', '3000', '2026-01-01', '2026-01-11'), rate('new', '6000', '2026-01-11')],
      period('2026-01-01', '2026-01-30')
    )

    expect(items.map((i) => i.totalAmount.toString())).toEqual(['1000', '4000'])
  })

  it('warns about days with no rate', () => {
    const { items, warnings } = calculateRetainer(
      retainer(),
      [rate('r1', '3000', '2026-01-11')],
      period('2026-01-01', '2026-01-30')
    )

    expect(items[0].totalAmount.toString()).toBe('2000')
    expect(warnings).toEqual(['Ana (Acme): 10 day(s) have no rate, so they were not paid.'])
  })

  it('pays nothing when the engagement is outside the period', () => {
    const { items, warnings } = calculateRetainer(
      retainer({ startDate: day('2026-02-01') }),
      [rate('r1', '3000', '2026-01-01')],
      period('2026-01-01', '2026-01-31')
    )

    expect(items).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })

  it('rounds to two decimal places', () => {
    const { items } = calculateRetainer(
      retainer(),
      [rate('r1', '1000', '2026-01-01')],
      period('2026-01-01', '2026-01-03', 'SEMI_MONTHLY')
    )

    expect(items[0].totalAmount.toString()).toBe('500')

    const partial = calculateRetainer(
      retainer({ endDate: day('2026-01-01') }),
      [rate('r1', '1000', '2026-01-01')],
      period('2026-01-01', '2026-01-03')
    )

    expect(partial.items[0].totalAmount.toString()).toBe('333.33')
  })
})

describe('calculateMilestones', () => {
  it('creates one item per milestone and links it', () => {
    const { items } = calculateMilestones(engagement, [
      { id: 'm1', title: 'Design', amount: '5000', currency: 'PHP' },
      { id: 'm2', title: 'Build', amount: '100', currency: 'USD' },
    ])

    expect(items.map((i) => i.milestoneId)).toEqual(['m1', 'm2'])
    expect(items.map((i) => `${i.currency} ${i.totalAmount}`)).toEqual(['PHP 5000', 'USD 100'])
    expect(items[0].notes).toBe('Design')
  })

  it('creates nothing when no milestones are due', () => {
    expect(calculateMilestones(engagement, []).items).toHaveLength(0)
  })
})

describe('convertToPhp', () => {
  it('converts and rounds half up', () => {
    expect(convertToPhp('100.00', '56.125').toString()).toBe('5612.5')
    expect(convertToPhp('0.01', '56.5').toString()).toBe('0.57')
  })
})
