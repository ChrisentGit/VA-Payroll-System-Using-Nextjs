import { requirePagePermission } from '@/lib/authz'
import { getPayrollSettings } from '@/lib/payroll/settings'
import PayrollSettingsForm from '@/components/payroll/PayrollSettingsForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function SettingsPage() {
  await requirePagePermission('payroll:manage')

  const settings = await getPayrollSettings()

  return (
    <div>
      <PageHeader title="Payroll Settings" description="How often your contractors are paid." />
      <FormPanel>
        <PayrollSettingsForm payFrequency={settings.payFrequency} />
      </FormPanel>
    </div>
  )
}
