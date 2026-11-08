import { Prisma } from '@prisma/client'

interface PaymentItem {
  contractorId: string
  totalAmountPhp: Prisma.Decimal | null
  paidAt: Date | null
  paidBy?: string | null
  paidTo?: string | null
  paymentReference?: string | null
}

// A contractor is paid once per run, however many engagements they have, so
// line items are rolled up to one payment per contractor.
export function groupPayments<T extends PaymentItem>(items: T[]) {
  const payments = new Map<
    string,
    { contractorId: string; first: T; phpTotal: Prisma.Decimal; isPaid: boolean }
  >()

  for (const item of items) {
    const payment = payments.get(item.contractorId)
    const amount = item.totalAmountPhp ?? new Prisma.Decimal(0)

    if (payment) {
      payment.phpTotal = payment.phpTotal.plus(amount)
      payment.isPaid = payment.isPaid && item.paidAt !== null
    } else {
      payments.set(item.contractorId, {
        contractorId: item.contractorId,
        first: item,
        phpTotal: amount,
        isPaid: item.paidAt !== null,
      })
    }
  }

  return [...payments.values()]
}

export function paymentProgress(items: PaymentItem[]) {
  const payments = groupPayments(items)
  return { paid: payments.filter((p) => p.isPaid).length, total: payments.length }
}
