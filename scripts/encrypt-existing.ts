// Encrypts tax IDs and account numbers saved before encryption was added.
// Safe to run more than once, because encrypted values are skipped.
//   npx tsx scripts/encrypt-existing.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { encrypt, isEncrypted } from '../lib/crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  let taxIds = 0
  let accountNumbers = 0

  await prisma.$transaction(async (tx) => {
    const contractors = await tx.contractor.findMany({
      where: { taxId: { not: null } },
      select: { id: true, taxId: true },
    })

    for (const { id, taxId } of contractors) {
      if (!taxId || isEncrypted(taxId)) continue
      await tx.contractor.update({ where: { id }, data: { taxId: encrypt(taxId) } })
      taxIds++
    }

    const details = await tx.contractorPaymentDetail.findMany({
      select: { id: true, accountNumber: true },
    })

    for (const { id, accountNumber } of details) {
      if (isEncrypted(accountNumber)) continue
      await tx.contractorPaymentDetail.update({
        where: { id },
        data: { accountNumber: encrypt(accountNumber) },
      })
      accountNumbers++
    }
  }, { timeout: 60_000 })

  console.log(`Encrypted ${taxIds} tax ID(s) and ${accountNumbers} account number(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
