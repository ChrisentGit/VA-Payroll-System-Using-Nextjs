import type { Prisma } from '@prisma/client'
import { PayrollError } from '@/lib/payroll/generate'

// Locks the run for the rest of the transaction and returns it, so its status
// cannot change between this check and the write that depends on it.
export async function lockDraftRun(tx: Prisma.TransactionClient, id: string, lockedMessage: string) {
  await tx.$queryRaw`SELECT id FROM "PayrollRun" WHERE id = ${id} FOR UPDATE`

  const run = await tx.payrollRun.findUnique({ where: { id }, include: { lineItems: true } })

  if (!run) throw new PayrollError('Payroll run not found', 404)
  if (run.status !== 'DRAFT') throw new PayrollError(lockedMessage, 409)

  return run
}
