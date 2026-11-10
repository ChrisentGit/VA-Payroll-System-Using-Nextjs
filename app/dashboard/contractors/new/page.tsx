import { requirePagePermission } from '@/lib/authz'
import ContractorForm from '@/components/contractors/ContractorForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewContractorPage() {
  await requirePagePermission('directory:write')

  return (
    <div className="space-y-6">
      <PageHeader title="Add Contractor" back={{ href: '/dashboard/contractors', label: 'Contractors' }} />
      <FormPanel>
        <ContractorForm />
      </FormPanel>
    </div>
  )
}