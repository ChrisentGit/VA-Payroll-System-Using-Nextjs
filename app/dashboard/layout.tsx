import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { isDemoMode } from "@/lib/demo";
import AppShell from "@/components/shell/AppShell";

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
    <AppShell
      variant="admin"
      name={session.user?.name ?? ""}
      email={session.user?.email ?? ""}
      role={role}
      isDemo={isDemoMode()}
    >
      {children}
    </AppShell>
  );
}
