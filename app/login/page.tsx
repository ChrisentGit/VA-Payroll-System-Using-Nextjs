import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { isDemoMode } from '@/lib/demo'
import DemoSignIn from '@/components/auth/DemoSignIn'
import LoginForm from '@/components/auth/LoginForm'
import { Logo } from '@/components/shell/Logo'

export const metadata: Metadata = { title: 'Sign in' }

const HIGHLIGHTS = [
  'Approve timesheets before they reach payroll',
  'Convert USD, EUR and AUD pay to PHP',
  'Give every contractor a clear payslip',
]

export default function LoginPage() {
  const isDemo = isDemoMode()

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-white lg:flex">
        <Link href="/" className="w-fit">
          <Logo onDark />
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-semibold">
            Payroll for your remote team, without the spreadsheets.
          </h2>
          <ul className="mt-8 space-y-3 text-sidebar-foreground">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-blue-300" aria-hidden />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-sidebar-foreground">© {new Date().getFullYear()} Bluemoso</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 block w-fit lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-semibold">{isDemo ? 'Try the demo' : 'Welcome back'}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {isDemo ? 'Pick a side to explore. No account needed.' : 'Sign in to your account.'}
          </p>
          {isDemo ? <DemoSignIn /> : <LoginForm />}
        </div>
      </main>
    </div>
  )
}
