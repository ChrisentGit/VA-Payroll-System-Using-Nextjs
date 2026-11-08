import { notFound } from 'next/navigation'
import { requirePortalContractor } from '@/lib/authz'
import { getPayslip } from '@/lib/payroll/payslip'
import Payslip from '@/components/payroll/Payslip'
import PrintButton from '@/components/payroll/PrintButton'

interface PageProps {
  params: Promise<{ runId: string }>
}

export default async function PortalPayslipPage({ params }: PageProps) {
  const { contractor } = await requirePortalContractor()

  const { runId } = await params
  const data = await getPayslip(runId, contractor.id)

  if (!data) notFound()

  return (
    <div className="p-6 print:p-0">
      <div className="mb-4">
        <PrintButton />
      </div>
      <Payslip data={data} />
    </div>
  )
}
