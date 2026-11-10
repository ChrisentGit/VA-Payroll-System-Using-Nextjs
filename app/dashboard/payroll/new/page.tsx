import Link from 'next/link'
import { requirePagePermission } from '@/lib/authz'
import { getPayrollSettings } from '@/lib/payroll/settings'
import { payFrequencyLabel } from '@/lib/labels'
import CreatePeriodForm from '@/components/payroll/CreatePeriodForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewPayrollPeriodPage() {
  await requirePagePermission('payroll:manage')

  const { payFrequency } = await getPayrollSettings()

  return (
    <div>
      <PageHeader
        title="New Payroll Period"
        back={{ href: '/dashboard/payroll', label: 'Payroll' }}
        description={
          <>
            Pay schedule: {payFrequencyLabel(payFrequency)}.{' '}
            <Link href="/dashboard/settings" className="text-primary underline underline-offset-2">
              Change in Settings
            </Link>
          </>
        }
      />
      <FormPanel>
        <CreatePeriodForm />
      </FormPanel>
    </div>
  )
}
