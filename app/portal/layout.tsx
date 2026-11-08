import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import SignOutButton from '@/components/SignOutButton'

const LINK = 'block px-3 py-2 rounded-lg hover:bg-white'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (!can(session.user.role, 'portal:access')) redirect('/dashboard')

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-50 border-r border-gray-200 p-4 print:hidden">
        <div className="font-bold text-lg text-blue-900 mb-6">VA Payroll</div>
        <nav className="space-y-1 text-sm">
          <Link href="/portal" className={LINK}>Overview</Link>
          <Link href="/portal/timesheets" className={LINK}>Timesheets</Link>
          <Link href="/portal/payslips" className={LINK}>Payslips</Link>
          <Link href="/portal/account" className={LINK}>My Account</Link>
        </nav>
        <div className="mt-8 pt-4 border-t text-xs text-gray-500">{session.user.name}</div>
        <div className="mt-2 text-sm">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 print:p-0">{children}</main>
    </div>
  )
}
