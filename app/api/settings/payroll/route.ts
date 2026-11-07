import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { getPayrollSettings } from '@/lib/payroll/settings'

const FREQUENCIES = ['MONTHLY', 'SEMI_MONTHLY'] as const

// GET /api/settings/payroll
export async function GET() {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    return NextResponse.json(await getPayrollSettings())
  } catch (error) {
    console.error('GET /api/settings/payroll error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PATCH /api/settings/payroll — applies to periods created from now on
export async function PATCH(request: NextRequest) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    const { payFrequency } = await request.json()

    if (!FREQUENCIES.includes(payFrequency)) {
      return NextResponse.json({ error: 'Invalid pay frequency' }, { status: 400 })
    }

    const settings = await prisma.payrollSettings.upsert({
      where: { id: 'default' },
      update: { payFrequency },
      create: { id: 'default', payFrequency },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('PATCH /api/settings/payroll error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
