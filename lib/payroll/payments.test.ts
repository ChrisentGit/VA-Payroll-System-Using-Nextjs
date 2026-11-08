import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { groupPayments, paymentProgress } from './payments'

const item = (contractorId: string, php: number | null, paid = false) => ({
  contractorId,
  totalAmountPhp: php === null ? null : new Prisma.Decimal(php),
  paidAt: paid ? new Date('2026-11-01') : null,
})

describe('groupPayments', () => {
  it('rolls engagements up to one payment per contractor', () => {
    const payments = groupPayments([item('a', 100.1), item('a', 200.2), item('b', 50)])

    expect(payments).toHaveLength(2)
    expect(payments[0].phpTotal.toFixed(2)).toBe('300.30')
    expect(payments[1].phpTotal.toFixed(2)).toBe('50.00')
  })

  it('counts a contractor as paid only when every item is paid', () => {
    expect(groupPayments([item('a', 1, true), item('a', 1)])[0].isPaid).toBe(false)
    expect(groupPayments([item('a', 1, true), item('a', 1, true)])[0].isPaid).toBe(true)
  })

  it('treats an unconverted amount as zero', () => {
    expect(groupPayments([item('a', null)])[0].phpTotal.toFixed(2)).toBe('0.00')
  })
})

describe('paymentProgress', () => {
  it('counts contractors, not line items', () => {
    expect(paymentProgress([item('a', 1, true), item('a', 1, true), item('b', 1)])).toEqual({
      paid: 1,
      total: 2,
    })
  })

  it('handles an empty run', () => {
    expect(paymentProgress([])).toEqual({ paid: 0, total: 0 })
  })
})
