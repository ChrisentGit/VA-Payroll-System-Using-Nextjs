import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">My Account</h1>
      <p className="text-sm text-gray-600 mb-6">{session.user.email}</p>
      <ChangePasswordForm
        email={session.user.email ?? ''}
        forced={session.user.mustChangePassword === true}
      />
    </div>
  )
}
