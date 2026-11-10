import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { can } from '@/lib/permissions'
import { toMaskedDetail } from '@/lib/payment-details'
import ContractorForm from '@/components/contractors/ContractorForm'
import PaymentDetailsCard from '@/components/contractors/PaymentDetailsCard'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditContractorPage({ params }: EditPageProps) {
  const session = await requirePagePermission('directory:write')

  const { id } = await params
  const contractor = await prisma.contractor.findUnique({
    where: { id },
    omit: { taxId: false },
    include: { paymentDetails: { orderBy: { createdAt: 'asc' } } },
  })

  if (!contractor) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Contractor" back={{ href: '/dashboard/contractors', label: 'Contractors' }} />
      <FormPanel>
        <ContractorForm
          contractorId={contractor.id}
          initialData={{
            name: contractor.name,
            email: contractor.email,
            phone: contractor.phone,
            taxId: contractor.taxId ? decrypt(contractor.taxId) : null,
            status: contractor.status,
            startDate: contractor.startDate?.toISOString() || null,
            endDate: contractor.endDate?.toISOString() || null,
            notes: contractor.notes,
          }}
        />
      </FormPanel>
      {can(session.user.role, 'contractors:sensitive') && (
        <PaymentDetailsCard
          contractorId={contractor.id}
          details={contractor.paymentDetails.map(toMaskedDetail)}
        />
      )}
    </div>
  )
}