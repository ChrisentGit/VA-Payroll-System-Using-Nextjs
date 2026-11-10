import { requirePagePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import PayoutCard from '@/components/portal/PayoutCard'
import PageHeader from '@/components/shell/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PortalAccountPage() {
  const session = await requirePagePermission('portal:access')

  // A login with no contractor profile can still change its password
  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="My Account" description={session.user.email} />
      {contractor && <PayoutCard contractorId={contractor.id} />}
      <Card>
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
