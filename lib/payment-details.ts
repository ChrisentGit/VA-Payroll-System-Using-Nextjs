import { decrypt } from '@/lib/crypto'

export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'Bank transfer',
  GCASH: 'GCash',
  MAYA: 'Maya',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  OTHER: 'Other',
} as const

export function isPaymentMethod(value: unknown): value is keyof typeof PAYMENT_METHODS {
  return typeof value === 'string' && value in PAYMENT_METHODS
}

export function methodLabel(method: string): string {
  return PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method
}

// Shows at most the last 4 characters, and fewer on short values so that
// a short number is never shown in full.
export function maskAccountNumber(value: string): string {
  const visible = Math.min(4, Math.max(0, value.length - 4))
  return visible === 0 ? '••••' : `•••• ${value.slice(-visible)}`
}

interface StoredDetail {
  id: string
  method: string
  accountName: string
  accountNumber: string
  bankName: string | null
  isDefault: boolean
}

// The only shape that goes to a browser. The full number stays on the server.
export function toMaskedDetail(detail: StoredDetail) {
  return {
    id: detail.id,
    method: detail.method,
    accountName: detail.accountName,
    accountNumberMasked: maskAccountNumber(decrypt(detail.accountNumber)),
    bankName: detail.bankName,
    isDefault: detail.isDefault,
  }
}

export type MaskedDetail = ReturnType<typeof toMaskedDetail>

export function describeDetail(detail: StoredDetail): string {
  const masked = toMaskedDetail(detail)
  return `${masked.bankName || methodLabel(masked.method)} ${masked.accountNumberMasked}`
}
