import { requirePagePermission } from '@/lib/authz'
import ContractorForm from '@/components/contractors/ContractorForm'

export default async function NewContractorPage() {
  await requirePagePermission('directory:write')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add Contractor</h1>
      <ContractorForm />
    </div>
  )
}