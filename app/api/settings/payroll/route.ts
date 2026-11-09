import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, enumValue, readBody } from '@/lib/validation'
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
    const { session } = guard

    const body = await readBody(request)
    const payFrequency = enumValue(body.payFrequency, FREQUENCIES, 'payFrequency')

    if (!payFrequency) {
      return NextResponse.json({ error: 'Invalid pay frequency' }, { status: 400 })
    }

    const [settings] = await prisma.$transaction([
      prisma.payrollSettings.upsert({
        where: { id: 'default' },
        update: { payFrequency },
        create: { id: 'default', payFrequency },
      }),
      recordAudit(prisma, session, {
        action: 'settings.payroll_updated',
        entityType: 'PayrollSettings',
        entityId: 'default',
        metadata: { payFrequency },
      }),
    ])

    return NextResponse.json(settings)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('PATCH /api/settings/payroll error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
