import { NextResponse } from 'next/server'
import {
  ClientStatus,
  ContractorStatus,
  Currency,
  ProjectPayMode,
  RateType,
  RetainerBasis,
} from '@prisma/client'

export const CURRENCIES = Object.values(Currency)
export const CLIENT_STATUSES = Object.values(ClientStatus)
export const CONTRACTOR_STATUSES = Object.values(ContractorStatus)
export const RATE_TYPES = Object.values(RateType)
export const RETAINER_BASES = Object.values(RetainerBasis)
export const PROJECT_PAY_MODES = Object.values(ProjectPayMode)
export const ENGAGEMENT_STATUSES = ['active', 'paused', 'ended'] as const

// Whole-number digits the Decimal(10, 2) and Decimal(12, 2) columns can hold
export const RATE_WHOLE_DIGITS = 8
export const MILESTONE_WHOLE_DIGITS = 10

// Bad input from a request. Route handlers turn it into a 400 in their catch block.
export class ValidationError extends Error {}

const fail = (message: string): never => {
  throw new ValidationError(message)
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail('The request body must be a JSON object')
  }

  return body as Record<string, unknown>
}

const MAX_TEXT = 5000

export function requiredText(value: unknown, field: string, max = MAX_TEXT): string {
  if (typeof value !== 'string' || !value.trim()) return fail(`${field} is required`)
  if (value.length > max) return fail(`${field} is too long`)
  return value.trim()
}

// For PATCH bodies: left out means "keep the saved value", but it cannot be blanked.
export function textIfSent(value: unknown, field: string, max = MAX_TEXT): string | undefined {
  return value === undefined ? undefined : requiredText(value, field, max)
}

// Left out stays undefined (no change). Blank or null clears the field.
export function optionalText(value: unknown, field: string, max = MAX_TEXT): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return requiredText(value, field, max)
}

export function requiredDate(value: unknown, field: string): Date {
  const date = typeof value === 'string' && value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return fail(`${field} must be a valid date`)
  return date
}

// Left out stays undefined (no change). Blank or null clears the field.
export function optionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return requiredDate(value, field)
}

// Left out or blank stays undefined, so the caller's default or saved value applies.
export function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !allowed.includes(value as T)) return fail(`Invalid ${field}`)
  return value as T
}

function decimalText(value: unknown): string | null {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && /^\d+(\.\d{1,2})?$/.test(text.trim()) ? text.trim() : null
}

// A positive amount with at most two decimals. Returned as text so it reaches
// the database without passing through a floating-point number.
export function moneyAmount(value: unknown, field: string, maxWholeDigits: number): string {
  const text = decimalText(value)

  if (!text || !(Number(text) > 0)) return fail(`${field} must be a positive amount`)
  if (text.split('.')[0].replace(/^0+/, '').length > maxWholeDigits) return fail(`${field} is too large`)

  return text
}

// Left out stays undefined (no change). Blank or null clears the hours.
export function optionalHours(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null

  const text = decimalText(value)
  if (!text || !(Number(text) > 0 && Number(text) <= 24)) return fail('Hours must be between 0 and 24')

  return text
}

// Call first in a catch block. Returns null for errors that are real server faults.
export function clientErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const code = error && typeof error === 'object' && 'code' in error ? error.code : null

  if (code === 'P2003') {
    return NextResponse.json({ error: 'A linked record does not exist' }, { status: 400 })
  }
  if (code === 'P2020') {
    return NextResponse.json({ error: 'A value is too large to save' }, { status: 400 })
  }

  return null
}
