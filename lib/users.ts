import type { prisma } from '@/lib/prisma'

export const ROLES = ['SUPER_ADMIN', 'FINANCE_OFFICER', 'CLIENT_MANAGER', 'CONTRACTOR'] as const
export type RoleName = (typeof ROLES)[number]

export function isRole(value: unknown): value is RoleName {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export const BCRYPT_ROUNDS = 12

// bcrypt ignores everything past 72 bytes, so longer passwords are refused
// rather than silently cut short.
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 12) {
    return 'Password must be at least 12 characters'
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must be at most 72 bytes'
  }
  return null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export class ContractorAlreadyLinkedError extends Error {}

type Tx = Pick<typeof prisma, 'contractor'>

// Points a user at one contractor profile, or none, inside the caller's
// transaction. Throws if that profile already belongs to another user.
export async function linkContractor(tx: Tx, userId: string, contractorId: string | null) {
  await tx.contractor.updateMany({
    where: { userId, ...(contractorId && { id: { not: contractorId } }) },
    data: { userId: null },
  })

  if (!contractorId) return

  const { count } = await tx.contractor.updateMany({
    where: { id: contractorId, OR: [{ userId: null }, { userId }] },
    data: { userId },
  })

  if (count === 0) throw new ContractorAlreadyLinkedError()
}
