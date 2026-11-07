import { requirePagePermission } from '@/lib/authz'
import { getPayrollSettings } from '@/lib/payroll/settings'
import PayrollSettingsForm from '@/components/payroll/PayrollSettingsForm'

export default async function SettingsPage() {
  await requirePagePermission('payroll:manage')

  const settings = await getPayrollSettings()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Payroll Settings</h1>
      <PayrollSettingsForm payFrequency={settings.payFrequency} />
    </div>
  )
}
