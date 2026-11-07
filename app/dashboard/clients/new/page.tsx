import { requirePagePermission } from '@/lib/authz'
import ClientForm from '@/components/clients/ClientForm'

export default async function NewClientPage() {
  await requirePagePermission('directory:write')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add Client</h1>
      <ClientForm />
    </div>
  )
}