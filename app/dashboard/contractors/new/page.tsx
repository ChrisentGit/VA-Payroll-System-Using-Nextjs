import ContractorForm from '@/components/contractors/ContractorForm'

export default function NewContractorPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add Contractor</h1>
      <ContractorForm />
    </div>
  )
}