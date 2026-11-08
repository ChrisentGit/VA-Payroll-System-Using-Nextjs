// Spreadsheets run a cell starting with one of these as a formula. Names and
// notes come from users, so they are neutralized with a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''

  const text = typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : String(value)

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// The leading byte order mark makes Excel read the file as UTF-8, so names
// like Peñaranda display correctly.
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
