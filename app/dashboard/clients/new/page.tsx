import { requirePagePermission } from '@/lib/authz'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewClientPage() {
  await requirePagePermission('directory:write')

  return (
    <div className="space-y-6">
      <PageHeader title="Add Client" back={{ href: '/dashboard/clients', label: 'Clients' }} />
      <FormPanel>
        <ClientForm />
      </FormPanel>
    </div>
  )
}