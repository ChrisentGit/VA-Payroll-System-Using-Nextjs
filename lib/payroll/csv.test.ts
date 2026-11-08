import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from './csv'

describe('csvCell', () => {
  it('leaves plain values alone and blanks nulls', () => {
    expect(csvCell('Maria')).toBe('Maria')
    expect(csvCell(12.5)).toBe('12.5')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('Santos, Maria')).toBe('"Santos, Maria"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`)
    expect(csvCell('+1234')).toBe("'+1234")
    expect(csvCell('-1234')).toBe("'-1234")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
})

describe('toCsv', () => {
  it('starts with a byte order mark and uses CRLF rows', () => {
    expect(toCsv([['a', 'b'], [1, null]])).toBe('﻿a,b\r\n1,\r\n')
  })
})
