import { describe, expect, it } from 'vitest'
import {
  ValidationError,
  clientErrorResponse,
  enumValue,
  moneyAmount,
  optionalDate,
  optionalHours,
  optionalText,
  readBody,
  requiredDate,
  requiredText,
  textIfSent,
} from './validation'

describe('optionalDate', () => {
  it('leaves an omitted date alone, so a partial update keeps the saved one', () => {
    expect(optionalDate(undefined, 'startDate')).toBeUndefined()
  })

  it('clears the date when sent blank or null', () => {
    expect(optionalDate('', 'startDate')).toBeNull()
    expect(optionalDate(null, 'startDate')).toBeNull()
  })

  it('parses a valid date and refuses anything else', () => {
    expect(optionalDate('2026-11-09', 'startDate')).toEqual(new Date('2026-11-09'))
    expect(() => optionalDate('not-a-date', 'startDate')).toThrow(ValidationError)
    expect(() => optionalDate(5, 'startDate')).toThrow(ValidationError)
  })
})

describe('requiredDate', () => {
  it('refuses a missing or blank date', () => {
    expect(() => requiredDate(undefined, 'date')).toThrow(ValidationError)
    expect(() => requiredDate('', 'date')).toThrow(ValidationError)
  })
})

describe('text', () => {
  it('trims required text and refuses blanks and non-strings', () => {
    expect(requiredText('  Ana ', 'name')).toBe('Ana')
    expect(() => requiredText('   ', 'name')).toThrow(ValidationError)
    expect(() => requiredText({ a: 1 }, 'name')).toThrow(ValidationError)
  })

  it('refuses text over the limit', () => {
    expect(() => requiredText('x'.repeat(11), 'name', 10)).toThrow(ValidationError)
  })

  it('treats omitted, blank and non-string optional text differently', () => {
    expect(optionalText(undefined, 'notes')).toBeUndefined()
    expect(optionalText('', 'notes')).toBeNull()
    expect(() => optionalText(7, 'notes')).toThrow(ValidationError)
  })

  it('lets a PATCH omit required text but not blank it', () => {
    expect(textIfSent(undefined, 'name')).toBeUndefined()
    expect(() => textIfSent('', 'name')).toThrow(ValidationError)
  })
})

describe('enumValue', () => {
  const allowed = ['PHP', 'USD'] as const

  it('accepts listed values and treats omitted or blank as not sent', () => {
    expect(enumValue('USD', allowed, 'currency')).toBe('USD')
    expect(enumValue(undefined, allowed, 'currency')).toBeUndefined()
    expect(enumValue('', allowed, 'currency')).toBeUndefined()
  })

  it('refuses anything else', () => {
    expect(() => enumValue('GBP', allowed, 'currency')).toThrow(ValidationError)
    expect(() => enumValue(1, allowed, 'currency')).toThrow(ValidationError)
  })
})

describe('moneyAmount', () => {
  it('accepts strings and numbers with up to two decimals', () => {
    expect(moneyAmount('1500.50', 'amount', 8)).toBe('1500.50')
    expect(moneyAmount(25, 'amount', 8)).toBe('25')
  })

  it.each(['0', '-5', 'abc', '1e5', '1.234', '', null, undefined])('refuses %s', (value) => {
    expect(() => moneyAmount(value, 'amount', 8)).toThrow(ValidationError)
  })

  it('refuses a value too large for the column', () => {
    expect(moneyAmount('99999999.99', 'amount', 8)).toBe('99999999.99')
    expect(() => moneyAmount('100000000', 'amount', 8)).toThrow(ValidationError)
  })
})

describe('optionalHours', () => {
  it('keeps omitted hours and clears blank hours', () => {
    expect(optionalHours(undefined)).toBeUndefined()
    expect(optionalHours('')).toBeNull()
  })

  it('accepts more than 0 up to 24', () => {
    expect(optionalHours('7.5')).toBe('7.5')
    expect(optionalHours(24)).toBe('24')
  })

  it.each(['0', '24.01', '-1', 'eight'])('refuses %s', (value) => {
    expect(() => optionalHours(value)).toThrow(ValidationError)
  })
})

describe('readBody', () => {
  const request = (body: string) => new Request('http://test', { method: 'POST', body })

  it('returns a JSON object', async () => {
    await expect(readBody(request('{"a":1}'))).resolves.toEqual({ a: 1 })
  })

  it.each(['{broken', '[1,2]', 'null', '""'])('refuses %s', async (body) => {
    await expect(readBody(request(body))).rejects.toThrow(ValidationError)
  })
})

describe('clientErrorResponse', () => {
  it('maps bad input and bad references to 400', () => {
    expect(clientErrorResponse(new ValidationError('nope'))?.status).toBe(400)
    expect(clientErrorResponse({ code: 'P2003' })?.status).toBe(400)
    expect(clientErrorResponse({ code: 'P2020' })?.status).toBe(400)
  })

  it('leaves real server faults alone', () => {
    expect(clientErrorResponse(new Error('database down'))).toBeNull()
    expect(clientErrorResponse({ code: 'P1001' })).toBeNull()
  })
})
