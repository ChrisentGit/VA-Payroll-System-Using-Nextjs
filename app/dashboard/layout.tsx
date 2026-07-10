import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-50 border-r border-gray-200 p-4">
        <div className="font-bold text-lg text-blue-900 mb-6">VA Payroll</div>
        <nav className="space-y-1 text-sm">
          <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white">Dashboard</Link>
          <Link href="/dashboard/contractors" className="block px-3 py-2 rounded-lg hover:bg-white">Contractors</Link>
          <Link href="/dashboard/clients" className="block px-3 py-2 rounded-lg hover:bg-white">Clients</Link>
          <Link href="/dashboard/engagements" className="block px-3 py-2 rounded-lg hover:bg-white">Engagements</Link>
          <Link href="/dashboard/timesheets" className="block px-3 py-2 rounded-lg hover:bg-white">Timesheets</Link>
        </nav>
        <div className="mt-8 pt-4 border-t text-xs text-gray-500">
          {session.user?.name} — {session.user?.role}
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}