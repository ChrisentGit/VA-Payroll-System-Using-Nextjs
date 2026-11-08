import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'
import type { prisma } from '@/lib/prisma'

interface AuditEntry {
  action: string
  entityType: string
  entityId: string
  // Never put tax IDs, account numbers, or passwords in here.
  metadata?: Prisma.InputJsonValue
}

// Pass the transaction the change happens in, so a change is never saved
// without its audit row, or the other way around.
export function recordAudit(
  db: Pick<typeof prisma, 'auditLog'>,
  session: Session,
  { action, entityType, entityId, metadata }: AuditEntry
) {
  return db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? 'unknown',
      action,
      entityType,
      entityId,
      metadata: metadata ?? {},
    },
  })
}
