import bcrypt from 'bcryptjs'
import { CredentialsSignin } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { clearAttempts, countAttempt } from '@/lib/throttle'
import { NO_SUCH_USER_HASH, normalizeEmail } from '@/lib/users'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_CONTRACTOR_EMAIL,
  DEMO_EMAIL_DOMAIN,
  isDemoMode,
} from '@/lib/demo'

const MAX_ATTEMPTS_PER_EMAIL = 10
const MAX_ATTEMPTS_PER_IP = 50
const MAX_EMAIL_LENGTH = 254

export class TooManyAttemptsError extends CredentialsSignin {
  code = 'too_many_attempts'
}

function recordLoginEvent(
  action: string,
  email: string,
  userId: string | null,
  metadata: Prisma.InputJsonObject
) {
  return prisma.auditLog.create({
    data: {
      actorId: userId ?? 'anonymous',
      actorEmail: email,
      action,
      entityType: 'Auth',
      entityId: userId ?? 'unknown',
      metadata,
    },
  })
}

// Limits apply to any email typed in, and every account is put through the same
// bcrypt work, so neither the response nor its timing shows which emails exist.
export async function verifyLogin(rawEmail: unknown, password: unknown, ip: string | null) {
  if (typeof rawEmail !== 'string' || typeof password !== 'string') return null

  const email = normalizeEmail(rawEmail)
  if (!email || email.length > MAX_EMAIL_LENGTH) return null

  const emailKey = `email:${email}`
  const [emailAttempts, ipAttempts] = await Promise.all([
    countAttempt(emailKey),
    ip ? countAttempt(`ip:${ip}`) : 0,
  ])

  if (emailAttempts > MAX_ATTEMPTS_PER_EMAIL || ipAttempts > MAX_ATTEMPTS_PER_IP) {
    // Logged once per lockout, so an attack cannot flood the audit log with these
    if (emailAttempts === MAX_ATTEMPTS_PER_EMAIL + 1 || ipAttempts === MAX_ATTEMPTS_PER_IP + 1) {
      await recordLoginEvent('auth.login_locked', email, null, { ip })
    }
    throw new TooManyAttemptsError()
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? NO_SUCH_USER_HASH)

  if (!user || !user.isActive || !passwordMatches) {
    const reason = !user ? 'unknown_email' : !user.isActive ? 'inactive' : 'wrong_password'
    await recordLoginEvent('auth.login_failed', email, user?.id ?? null, { ip, reason })
    return null
  }

  await clearAttempts(emailKey)
  await recordLoginEvent('auth.login_succeeded', user.email, user.id, { ip })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
  }
}

// These sign-ins need no password, so they only work when demo mode is on and
// the database holds nothing but demo accounts. Turning on demo mode by mistake
// over real data therefore opens nothing.
export async function verifyDemoLogin(account: unknown) {
  if (!isDemoMode()) return null

  const email =
    account === 'admin' ? DEMO_ADMIN_EMAIL : account === 'contractor' ? DEMO_CONTRACTOR_EMAIL : null
  if (!email) return null

  const realAccounts = await prisma.user.count({
    where: { NOT: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } },
  })
  if (realAccounts > 0) return null

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.isActive) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
  }
}
