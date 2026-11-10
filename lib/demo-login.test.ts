import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: { count: vi.fn(), findUnique: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('next-auth', () => ({ CredentialsSignin: class extends Error {} }))

import { verifyDemoLogin } from './login'
import { DEMO_ADMIN_EMAIL } from './demo'

const demoAdmin = {
  id: 'demo-admin',
  name: 'Alex Rivera',
  email: DEMO_ADMIN_EMAIL,
  role: 'SUPER_ADMIN',
  isActive: true,
  sessionVersion: 0,
  mustChangePassword: false,
}

describe('verifyDemoLogin', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true')
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.user.findUnique.mockResolvedValue(demoAdmin)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('signs in the demo admin on a demo database', async () => {
    await expect(verifyDemoLogin('admin')).resolves.toMatchObject({ email: DEMO_ADMIN_EMAIL })
  })

  it('refuses when demo mode is off', async () => {
    vi.stubEnv('DEMO_MODE', 'false')

    await expect(verifyDemoLogin('admin')).resolves.toBeNull()
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('refuses when the database holds any other account', async () => {
    prismaMock.user.count.mockResolvedValue(1)

    await expect(verifyDemoLogin('admin')).resolves.toBeNull()
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('refuses unknown account names', async () => {
    await expect(verifyDemoLogin('__proto__')).resolves.toBeNull()
    await expect(verifyDemoLogin(undefined)).resolves.toBeNull()
  })

  it('refuses a deactivated demo account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...demoAdmin, isActive: false })

    await expect(verifyDemoLogin('admin')).resolves.toBeNull()
  })
})
