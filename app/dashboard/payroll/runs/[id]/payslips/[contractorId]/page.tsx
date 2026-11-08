import { notFound } from 'next/navigation'
import { requirePagePermission } from '@/lib/authz'
import { getPayslip } from '@/lib/payroll/payslip'
import Payslip from '@/components/payroll/Payslip'
import PrintButton from '@/components/payroll/PrintButton'

interface PageProps {
  params: Promise<{ id: string; contractorId: string }>
}

export default async function AdminPayslipPage({ params }: PageProps) {
  await requirePagePermission('payroll:manage')

  const { id, contractorId } = await params
  const data = await getPayslip(id, contractorId)

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
