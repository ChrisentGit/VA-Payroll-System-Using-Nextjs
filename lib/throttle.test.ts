import { describe, expect, it } from 'vitest'
import { clientIp } from './throttle'

describe('clientIp', () => {
  it('prefers the address set by the host', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('203.0.113.9')
  })

  it('ignores forwarded entries the client could have sent itself', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('returns null when no address is known', () => {
    expect(clientIp(new Headers())).toBeNull()
  })
})
