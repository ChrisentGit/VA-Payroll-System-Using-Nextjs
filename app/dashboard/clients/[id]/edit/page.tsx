import { requirePagePermission } from '@/lib/authz'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditPageProps) {
  await requirePagePermission('directory:write')

  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Client" back={{ href: '/dashboard/clients', label: 'Clients' }} />
      <FormPanel>
        <ClientForm
          clientId={client.id}
          initialData={{
            name: client.name,
            email: client.email,
            contactPerson: client.contactPerson,
            billingCurrency: client.billingCurrency,
            status: client.status,
            notes: client.notes,
          }}
        />
      </FormPanel>
    </div>
  )
}