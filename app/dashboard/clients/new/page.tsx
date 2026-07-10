import ClientForm from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add Client</h1>
      <ClientForm />
    </div>
  )
}