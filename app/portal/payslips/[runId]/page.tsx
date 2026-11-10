import { notFound } from 'next/navigation'
import { requirePortalContractor } from '@/lib/authz'
import { getPayslip } from '@/lib/payroll/payslip'
import Payslip from '@/components/payroll/Payslip'
import PrintButton from '@/components/payroll/PrintButton'
import PageHeader from '@/components/shell/PageHeader'

interface PageProps {
  params: Promise<{ runId: string }>
}

export default async function PortalPayslipPage({ params }: PageProps) {
  const { contractor } = await requirePortalContractor()

  const { runId } = await params
  const data = await getPayslip(runId, contractor.id)

  if (!data) notFound()

  return (
    <div>
      <PageHeader
        title="Payslip"
        back={{ href: '/portal/payslips', label: 'Payslips' }}
        actions={<PrintButton />}
      />
      <Payslip data={data} />
    </div>
  )
}
