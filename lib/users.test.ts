import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { BCRYPT_ROUNDS, NO_SUCH_USER_HASH, isRole, normalizeEmail, passwordProblem } from './users'

describe('NO_SUCH_USER_HASH', () => {
  it('costs the same as a real password check, so timing reveals nothing', () => {
    expect(bcrypt.getRounds(NO_SUCH_USER_HASH)).toBe(BCRYPT_ROUNDS)
  })
})

describe('passwordProblem', () => {
  it('accepts a 12 character password', () => {
    expect(passwordProblem('abcdefghijkl')).toBeNull()
  })

  it('refuses short, missing and non-string passwords', () => {
    expect(passwordProblem('short')).toMatch('at least 12')
    expect(passwordProblem(undefined)).toMatch('at least 12')
    expect(passwordProblem(123456789012)).toMatch('at least 12')
  })

  it('measures the upper limit in bytes', () => {
    expect(passwordProblem('a'.repeat(72))).toBeNull()
    expect(passwordProblem('a'.repeat(73))).toMatch('at most 72')
    expect(passwordProblem('ñ'.repeat(37))).toMatch('at most 72')
  })
})

describe('isRole', () => {
  it('accepts known roles only', () => {
    expect(isRole('CONTRACTOR')).toBe(true)
    expect(isRole('ROOT')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Maria@Example.COM ')).toBe('maria@example.com')
  })
})
