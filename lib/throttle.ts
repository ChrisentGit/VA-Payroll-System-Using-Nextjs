import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Uses the database rather than memory so the limits hold across server instances.
// Timestamps are built in SQL so they all share one clock and one time zone.
const NOW = Prisma.sql`(NOW() AT TIME ZONE 'UTC')`
const EXPIRED = Prisma.sql`"LoginThrottle"."windowStart" <= ${NOW} - INTERVAL '15 minutes'`

// Counts this attempt and returns the total in the current 15-minute window.
// A single statement, so parallel attempts cannot all read the same low count.
export async function countAttempt(key: string): Promise<number> {
  await prisma.$executeRaw`DELETE FROM "LoginThrottle" WHERE ${EXPIRED}`

  const [row] = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "windowStart")
    VALUES (${key}, 1, ${NOW})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN ${EXPIRED} THEN 1 ELSE "LoginThrottle"."attempts" + 1 END,
      "windowStart" = CASE WHEN ${EXPIRED} THEN ${NOW} ELSE "LoginThrottle"."windowStart" END
    RETURNING "attempts"`

  return Number(row.attempts)
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { key } })
}

// x-real-ip is set by the host. In x-forwarded-for only the last entry was added
// by our own proxy, because a client can send any earlier ones itself.
export function clientIp(headers: Headers): string | null {
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwarded = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  return forwarded || null
}
