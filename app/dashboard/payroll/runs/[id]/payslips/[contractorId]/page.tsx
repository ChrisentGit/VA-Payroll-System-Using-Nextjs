import { notFound } from 'next/navigation'
import { requirePagePermission } from '@/lib/authz'
import { getPayslip } from '@/lib/payroll/payslip'
import Payslip from '@/components/payroll/Payslip'
import PrintButton from '@/components/payroll/PrintButton'
import PageHeader from '@/components/shell/PageHeader'

interface PageProps {
  params: Promise<{ id: string; contractorId: string }>
}

export default async function AdminPayslipPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id, contractorId } = await params
  const data = await getPayslip(id, contractorId)

  if (!data) notFound()

  return (
    <div>
      <PageHeader
        title="Payslip"
        back={{ href: `/dashboard/payroll/runs/${id}`, label: 'Payroll run' }}
        actions={<PrintButton />}
      />
      <Payslip data={data} />
    </div>
  )
}
