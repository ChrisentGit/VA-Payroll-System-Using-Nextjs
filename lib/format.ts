type Numeric = { toString(): string }

// Timestamps are shown in the company's own time zone, whatever the server uses.
const COMPANY_TIME_ZONE = 'Asia/Manila'

const calendarDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const companyDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: COMPANY_TIME_ZONE,
})

const companyDateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: COMPANY_TIME_ZONE,
})

export function formatMoney(currency: string, amount: Numeric): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(
    Number(amount.toString())
  )
}

// Period and timesheet dates are stored at UTC midnight, so read them in UTC.
export function formatDate(date: Date): string {
  return calendarDate.format(date)
}

export function formatDateRange(start: Date, end: Date): string {
  return `${calendarDate.format(start)} to ${calendarDate.format(end)}`
}

// For a moment in time, such as when a payment was recorded
export function formatMomentDate(date: Date): string {
  return companyDate.format(date)
}

export function formatMoment(date: Date): string {
  return companyDateTime.format(date)
}

// YYYY-MM-DD, for file names
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// The en-CA locale writes dates as YYYY-MM-DD. The result is the same on the
// server and in the browser, so a form can use it as its first value.
export function todayInCompanyZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COMPANY_TIME_ZONE }).format(now)
}
