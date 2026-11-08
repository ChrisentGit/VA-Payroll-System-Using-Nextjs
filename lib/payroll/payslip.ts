import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Finalized runs only, and only this contractor's lines. Every payslip view
// goes through here, so a contractor can never load someone else's pay.
export async function getPayslip(runId: string, contractorId: string) {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, status: 'FINALIZED', lineItems: { some: { contractorId } } },
    include: {
      payrollPeriod: true,
      lineItems: {
        where: { contractorId },
        orderBy: { createdAt: 'asc' },
        include: { engagement: { include: { client: { select: { name: true } } } } },
      },
    },
  })

  if (!run) return null

  const contractor = await prisma.contractor.findUniqueOrThrow({
    where: { id: contractorId },
    select: { name: true, email: true },
  })

  const phpTotal = run.lineItems.reduce(
    (sum, li) => sum.plus(li.totalAmountPhp ?? 0),
    new Prisma.Decimal(0)
  )

  return { run, contractor, items: run.lineItems, phpTotal }
}

export type PayslipData = NonNullable<Awaited<ReturnType<typeof getPayslip>>>
