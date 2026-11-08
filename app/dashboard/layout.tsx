import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { can } from "@/lib/permissions";
import SignOutButton from "@/components/SignOutButton";

const LINK = "block px-3 py-2 rounded-lg hover:bg-white";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;

  if (can(role, "portal:access")) {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-50 border-r border-gray-200 p-4 print:hidden">
        <div className="font-bold text-lg text-blue-900 mb-6">VA Payroll</div>
        <nav className="space-y-1 text-sm">
          <Link href="/dashboard" className={LINK}>Dashboard</Link>
          {can(role, "directory:read") && <Link href="/dashboard/contractors" className={LINK}>Contractors</Link>}
          {can(role, "directory:read") && <Link href="/dashboard/clients" className={LINK}>Clients</Link>}
          {can(role, "directory:read") && <Link href="/dashboard/engagements" className={LINK}>Engagements</Link>}
          {can(role, "timesheets:manage") && <Link href="/dashboard/timesheets" className={LINK}>Timesheets</Link>}
          {can(role, "payroll:manage") && <Link href="/dashboard/payroll" className={LINK}>Payroll</Link>}
          {can(role, "payroll:manage") && <Link href="/dashboard/settings" className={LINK}>Settings</Link>}
          {can(role, "users:manage") && <Link href="/dashboard/users" className={LINK}>Users</Link>}
          {can(role, "audit:read") && <Link href="/dashboard/audit" className={LINK}>Audit Log</Link>}
        </nav>
        <div className="mt-8 pt-4 border-t text-xs text-gray-500">
          {session.user?.name} — {session.user?.role}
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <Link href="/dashboard/account" className={LINK}>My Account</Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 print:p-0">{children}</main>
    </div>
  );
}
