import { prisma } from '@/lib/prisma'

export function getPayrollSettings() {
  return prisma.payrollSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
}
