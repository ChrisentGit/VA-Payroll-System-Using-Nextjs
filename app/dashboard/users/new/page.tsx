import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import UserForm from '@/components/users/UserForm'

export default async function NewUserPage() {
  await requirePagePermission('users:manage')

  const contractors = await prisma.contractor.findMany({
    where: { userId: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Add User</h1>
      <UserForm contractors={contractors} />
    </div>
  )
}
