import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ClientForm from '@/components/clients/ClientForm'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditPageProps) {
  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })

  if (!client) {
    notFound()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Client</h1>
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
    </div>
  )
}