'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Dialog } from 'radix-ui'
import {
  BriefcaseBusiness,
  Building2,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/shell/Logo'
import { can, type Permission } from '@/lib/permissions'
import { roleLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  permission?: Permission
}

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/contractors', label: 'Contractors', icon: Users, permission: 'directory:read' },
  { href: '/dashboard/clients', label: 'Clients', icon: Building2, permission: 'directory:read' },
  { href: '/dashboard/engagements', label: 'Engagements', icon: BriefcaseBusiness, permission: 'directory:read' },
  { href: '/dashboard/timesheets', label: 'Timesheets', icon: Clock, permission: 'timesheets:manage' },
  { href: '/dashboard/payroll', label: 'Payroll', icon: Wallet, permission: 'payroll:manage' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, permission: 'payroll:manage' },
  { href: '/dashboard/users', label: 'Users', icon: ShieldCheck, permission: 'users:manage' },
  { href: '/dashboard/audit', label: 'Audit Log', icon: ScrollText, permission: 'audit:read' },
  { href: '/dashboard/account', label: 'My Account', icon: UserRound },
]

const PORTAL_NAV: NavItem[] = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/timesheets', label: 'Timesheets', icon: Clock },
  { href: '/portal/payslips', label: 'Payslips', icon: FileText },
  { href: '/portal/account', label: 'Account', icon: UserRound },
]

function isCurrent(pathname: string, href: string): boolean {
  const isSectionHome = href === '/dashboard' || href === '/portal'
  return isSectionHome ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function SignOut({ className, label }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={className}
    >
      <LogOut className="size-[18px] shrink-0" aria-hidden />
      {label}
    </button>
  )
}

function SidebarLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm">
      {items.map(({ href, label, icon: Icon }) => {
        const current = isCurrent(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors lg:py-2',
              current
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{name}</div>
        <div className="truncate text-xs">{detail}</div>
      </div>
      <SignOut
        label="Sign out"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      />
    </div>
  )
}

function AdminMenu({ items, name, detail }: { items: NavItem[]; name: string; detail: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Open menu" className="-mr-2 rounded-lg p-2 hover:bg-sidebar-accent">
        <Menu className="size-6" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Links to every section you can open</Dialog.Description>
          <div className="flex h-14 items-center justify-between px-5 text-white">
            <Logo onDark />
            <Dialog.Close aria-label="Close menu" className="-mr-2 rounded-lg p-2 hover:bg-sidebar-accent">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <SidebarLinks items={items} onNavigate={() => setOpen(false)} />
          <UserFooter name={name} detail={detail} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const current = isCurrent(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
              current ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AppShell({
  variant,
  name,
  email,
  role,
  isDemo,
  children,
}: {
  variant: 'admin' | 'portal'
  name: string
  email: string
  role: string | undefined
  isDemo: boolean
  children: React.ReactNode
}) {
  const isPortal = variant === 'portal'
  const items = (isPortal ? PORTAL_NAV : ADMIN_NAV).filter(
    (item) => !item.permission || can(role, item.permission)
  )
  const detail = isPortal ? email : roleLabel(role)

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
        <div className="flex h-16 items-center px-6 text-white">
          <Logo onDark />
        </div>
        <SidebarLinks items={items} />
        <UserFooter name={name} detail={detail} />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-sidebar px-4 text-white lg:hidden print:hidden">
        <Logo onDark />
        {isPortal ? (
          <SignOut className="-mr-2 rounded-lg p-2 hover:bg-sidebar-accent" />
        ) : (
          <AdminMenu items={items} name={name} detail={detail} />
        )}
      </header>

      <div className="lg:pl-64 print:pl-0">
        {isDemo && (
          <div className="bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-900 print:hidden">
            You are viewing a read-only demo with made-up data. Changes are not saved.
          </div>
        )}
        <main
          className={cn(
            'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0',
            isPortal ? 'max-w-3xl pb-24 lg:pb-8' : 'max-w-7xl'
          )}
        >
          {children}
        </main>
      </div>

      {isPortal && <TabBar items={items} />}
    </div>
  )
}
