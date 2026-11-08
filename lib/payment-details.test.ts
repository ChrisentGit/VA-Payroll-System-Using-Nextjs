import { describe, expect, it } from 'vitest'
import { maskAccountNumber, isPaymentMethod } from './payment-details'

describe('maskAccountNumber', () => {
  it('shows the last 4 of a long number', () => {
    expect(maskAccountNumber('09171234567')).toBe('•••• 4567')
  })

  it('never shows a short number in full', () => {
    expect(maskAccountNumber('1234')).toBe('••••')
    expect(maskAccountNumber('12345')).toBe('•••• 5')
    expect(maskAccountNumber('')).toBe('••••')
  })
})

describe('isPaymentMethod', () => {
  it('accepts known methods only', () => {
    expect(isPaymentMethod('GCASH')).toBe(true)
    expect(isPaymentMethod('CRYPTO')).toBe(false)
    expect(isPaymentMethod(undefined)).toBe(false)
  })
})
