import { randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { decrypt, encrypt, encryptIfPresent, isEncrypted, usesCurrentKey } from './crypto'

describe('crypto', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
    delete process.env.ENCRYPTION_KEY_PREVIOUS
  })

  it('reads values saved under the previous key while rotating', () => {
    const oldKey = process.env.ENCRYPTION_KEY as string
    const stored = encrypt('1234567890')

    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
    process.env.ENCRYPTION_KEY_PREVIOUS = oldKey

    expect(usesCurrentKey(stored)).toBe(false)
    expect(decrypt(stored)).toBe('1234567890')
    expect(usesCurrentKey(encrypt('1234567890'))).toBe(true)
  })

  it('still refuses a value neither key can open', () => {
    const stored = encrypt('1234567890')

    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
    process.env.ENCRYPTION_KEY_PREVIOUS = randomBytes(32).toString('base64')

    expect(() => decrypt(stored)).toThrow()
  })

  it('round-trips text, including non-ASCII', () => {
    expect(decrypt(encrypt('123-456-789 Peñaranda'))).toBe('123-456-789 Peñaranda')
  })

  it('does not contain the plaintext and differs on every call', () => {
    const first = encrypt('1234567890')
    expect(first).not.toContain('1234567890')
    expect(isEncrypted(first)).toBe(true)
    expect(encrypt('1234567890')).not.toBe(first)
  })

  it('refuses a value that was tampered with', () => {
    const parts = encrypt('1234567890').split(':')
    const bytes = Buffer.from(parts[4], 'base64')
    bytes[0] ^= 1
    parts[4] = bytes.toString('base64')

    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('refuses to decrypt with a different key', () => {
    const stored = encrypt('1234567890')
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')

    expect(() => decrypt(stored)).toThrow()
  })

  it('passes through values saved before encryption', () => {
    expect(decrypt('legacy-plain-value')).toBe('legacy-plain-value')
  })

  it('stores empty values as null', () => {
    expect(encryptIfPresent('')).toBeNull()
    expect(encryptIfPresent(null)).toBeNull()
    expect(encryptIfPresent(undefined)).toBeNull()
  })

  it('fails clearly when the key is missing or the wrong size', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY is not set')

    process.env.ENCRYPTION_KEY = randomBytes(16).toString('base64')
    expect(() => encrypt('x')).toThrow('32 bytes')
  })
})
