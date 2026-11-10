import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Clock,
  Coins,
  FileText,
  Layers,
  ScrollText,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo'
import { Logo } from '@/components/shell/Logo'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Clock,
    title: 'Timesheet approvals',
    body: 'Contractors log hours, managers approve or send them back, and only approved time reaches payroll.',
  },
  {
    icon: Layers,
    title: 'Every way you pay',
    body: 'Hourly, monthly or per-period retainers, and projects paid on completion or by milestone.',
  },
  {
    icon: Coins,
    title: 'Pay in pesos',
    body: 'Bill in USD, EUR or AUD. Set the exchange rate once per run and it is locked when you finalize.',
  },
  {
    icon: FileText,
    title: 'Clear payslips',
    body: 'Every contractor gets a readable payslip they can open on a phone or save as a PDF.',
  },
  {
    icon: ShieldCheck,
    title: 'Sensitive data protected',
    body: 'Tax IDs and account numbers are encrypted, and each role only sees what it needs.',
  },
  {
    icon: ScrollText,
    title: 'A full audit trail',
    body: 'Every change and sign-in is recorded, so you can always see who did what and when.',
  },
]

const STEPS = [
  { title: 'Generate a draft', body: 'Approved hours, retainers and finished milestones are gathered for the period.' },
  { title: 'Set exchange rates', body: 'Enter this period’s rates and see the total in pesos.' },
  { title: 'Finalize', body: 'Lock the run so the numbers can no longer change.' },
  { title: 'Pay and record', body: 'Mark each person paid. Their payslip updates by itself.' },
]

const SAMPLE_ROWS = [
  { name: 'Maria Santos', amount: '₱48,210.00', status: 'PAID' },
  { name: 'Jose Reyes', amount: '₱52,578.00', status: 'UNPAID' },
  { name: 'Ana Dela Cruz', amount: '₱37,862.50', status: 'UNPAID' },
]

function SamplePayrollRun() {
  return (
    <figure className="rounded-2xl border bg-card p-5 shadow-xl sm:p-6">
      <div aria-hidden>
        <div className="flex items-center justify-between">
          <span className="font-semibold">October payroll</span>
          <StatusBadge status="FINALIZED" />
        </div>
        <div className="mt-4 rounded-lg bg-secondary px-4 py-3">
          <div className="text-sm text-secondary-foreground">Grand total</div>
          <div className="text-2xl font-semibold tabular-nums">₱138,650.50</div>
        </div>
        <ul className="mt-3 divide-y text-sm">
          {SAMPLE_ROWS.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 py-3">
              <span className="font-medium">{row.name}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{row.amount}</span>
                <StatusBadge status={row.status} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">Sample data for illustration</figcaption>
    </figure>
  )
}

export default async function LandingPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  const primaryLabel = isDemoMode() ? 'Try the demo' : 'Sign in'

  return (
    <div className="bg-card">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button asChild variant="outline">
          <Link href="/login">{primaryLabel}</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">
              Pay your remote team on time, in one place.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Bluemoso Payroll takes contractor hours from timesheet to payslip, with multi-currency
              conversion to pesos and a record of every change.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/login">
                  {primaryLabel}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
          <SamplePayrollRun />
        </section>

        <section className="bg-background py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-xl text-2xl font-semibold sm:text-3xl">
              Built for the way contractor payroll actually works
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border bg-card p-6 shadow-xs">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">From hours to payslips in four steps</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-sidebar text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Smartphone className="mt-1 size-7 shrink-0 text-blue-300" aria-hidden />
              <div>
                <h2 className="text-2xl font-semibold">Your contractors get their own portal</h2>
                <p className="mt-1.5 max-w-xl text-sidebar-foreground">
                  They can log hours and check their pay from a phone, without asking anyone.
                </p>
              </div>
            </div>
            <Button asChild size="lg" variant="secondary" className="w-full lg:w-auto">
              <Link href="/login">{primaryLabel}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Bluemoso
      </footer>
    </div>
  )
}
