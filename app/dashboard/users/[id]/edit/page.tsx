import { notFound } from 'next/navigation'
import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import UserForm from '@/components/users/UserForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await requirePagePermission('users:manage')

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      contractor: { select: { id: true } },
    },
  })

  if (!user) notFound()

  const contractors = await prisma.contractor.findMany({
    where: { OR: [{ userId: null }, { userId: id }] },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Edit User" back={{ href: '/dashboard/users', label: 'Users' }} />
      <FormPanel>
        <UserForm
          userId={user.id}
          isSelf={user.id === session.user.id}
          contractors={contractors}
          initialData={{
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            contractorId: user.contractor?.id ?? null,
          }}
        />
      </FormPanel>
    </div>
  )
}
