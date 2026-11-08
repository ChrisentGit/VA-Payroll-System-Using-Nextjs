type Numeric = { toString(): string }

export function formatMoney(currency: string, amount: Numeric): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(
    Number(amount.toString())
  )
}

// Period and timesheet dates are stored at UTC midnight, so read them in UTC.
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
