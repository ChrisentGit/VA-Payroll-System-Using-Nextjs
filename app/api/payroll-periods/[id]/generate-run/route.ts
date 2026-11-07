import { NextRequest, NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/authz'
import { generateRun, PayrollError } from '@/lib/payroll/generate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/payroll-periods/[id]/generate-run — builds the period's draft run
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('payroll:manage')
    if (guard.error) return guard.error

    const { id } = await params
    const run = await generateRun(id)

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    if (error instanceof PayrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This period already has a payroll run.' },
        { status: 409 }
      )
    }
    console.error('POST /api/payroll-periods/[id]/generate-run error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payroll run' },
      { status: 500 }
    )
  }
}
