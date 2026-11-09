// Re-encrypts tax IDs and account numbers with the current ENCRYPTION_KEY.
// Set ENCRYPTION_KEY to the new key and ENCRYPTION_KEY_PREVIOUS to the old one.
// Safe to run more than once, because values already on the new key are skipped.
// All or nothing: one unreadable value rolls the whole run back.
//   npx tsx scripts/rotate-encryption-key.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { decrypt, encrypt, isEncrypted, usesCurrentKey } from '../lib/crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const needsRotation = (value: string) => isEncrypted(value) && !usesCurrentKey(value)

async function main() {
  if (!process.env.ENCRYPTION_KEY_PREVIOUS) {
    throw new Error('Set ENCRYPTION_KEY_PREVIOUS to the old key before rotating')
  }

  let rotated = 0

  await prisma.$transaction(async (tx) => {
    const contractors = await tx.contractor.findMany({
      where: { taxId: { not: null } },
      select: { id: true, taxId: true },
    })

    for (const { id, taxId } of contractors) {
      if (!taxId || !needsRotation(taxId)) continue
      await tx.contractor.update({ where: { id }, data: { taxId: encrypt(decrypt(taxId)) } })
      rotated++
    }

    const details = await tx.contractorPaymentDetail.findMany({
      select: { id: true, accountNumber: true },
    })

    for (const { id, accountNumber } of details) {
      if (!needsRotation(accountNumber)) continue
      await tx.contractorPaymentDetail.update({
        where: { id },
        data: { accountNumber: encrypt(decrypt(accountNumber)) },
      })
      rotated++
    }
  }, { timeout: 60_000 })

  console.log(`Re-encrypted ${rotated} value(s). ENCRYPTION_KEY_PREVIOUS can now be removed.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
