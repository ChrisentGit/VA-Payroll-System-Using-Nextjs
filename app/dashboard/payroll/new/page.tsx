import { requirePagePermission } from '@/lib/authz'
import Link from 'next/link'
import { getPayrollSettings } from '@/lib/payroll/settings'
import CreatePeriodForm from '@/components/payroll/CreatePeriodForm'

export default async function NewPayrollPeriodPage() {
  await requirePagePermission('payroll:manage')

  const { payFrequency } = await getPayrollSettings()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">New Payroll Period</h1>
      <p className="text-sm text-gray-500 mb-6">
        Pay schedule: {payFrequency === 'SEMI_MONTHLY' ? 'Twice a month' : 'Monthly'} (
        <Link href="/dashboard/settings" className="underline">
          change in Settings
        </Link>
        )
      </p>
      <CreatePeriodForm />
    </div>
  )
}