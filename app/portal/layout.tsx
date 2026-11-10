import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { isDemoMode } from '@/lib/demo'
import AppShell from '@/components/shell/AppShell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (!can(session.user.role, 'portal:access')) redirect('/dashboard')

  return (
    <AppShell
      variant="portal"
      name={session.user.name ?? ''}
      email={session.user.email ?? ''}
      role={session.user.role}
      isDemo={isDemoMode()}
    >
      {children}
    </AppShell>
  )
}
