import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import UserForm from '@/components/users/UserForm'
import PageHeader from '@/components/shell/PageHeader'
import { FormPanel } from '@/components/shell/Panels'

export default async function NewUserPage() {
  await requirePagePermission('users:manage')

  const contractors = await prisma.contractor.findMany({
    where: { userId: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Add User" back={{ href: '/dashboard/users', label: 'Users' }} />
      <FormPanel>
        <UserForm contractors={contractors} />
      </FormPanel>
    </div>
  )
}
