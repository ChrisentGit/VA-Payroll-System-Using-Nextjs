import { describe, expect, it } from 'vitest'
import { formatDate, formatDateRange, formatMoment, isoDate, todayInCompanyZone } from './format'

describe('formatDate', () => {
  it('reads stored UTC midnight dates in UTC', () => {
    expect(formatDate(new Date('2026-11-01T00:00:00.000Z'))).toBe('Nov 1, 2026')
  })
})

describe('formatDateRange', () => {
  it('joins both ends of a period', () => {
    expect(
      formatDateRange(new Date('2026-11-01T00:00:00.000Z'), new Date('2026-11-15T00:00:00.000Z'))
    ).toBe('Nov 1, 2026 to Nov 15, 2026')
  })
})

describe('formatMoment', () => {
  it('shows an instant in the company time zone', () => {
    expect(formatMoment(new Date('2026-11-09T16:30:00.000Z'))).toContain('Nov 10, 2026')
  })
})

describe('isoDate', () => {
  it('keeps the sortable form used in file names', () => {
    expect(isoDate(new Date('2026-11-01T00:00:00.000Z'))).toBe('2026-11-01')
  })
})

describe('todayInCompanyZone', () => {
  it('has already moved to the next day in Manila while UTC has not', () => {
    expect(todayInCompanyZone(new Date('2026-11-09T20:00:00.000Z'))).toBe('2026-11-10')
  })
})
