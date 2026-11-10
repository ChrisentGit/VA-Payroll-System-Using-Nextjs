import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import PageHeader from '@/components/shell/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div>
      <PageHeader title="My Account" description={session.user.email} />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm
            email={session.user.email ?? ''}
            forced={session.user.mustChangePassword === true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
