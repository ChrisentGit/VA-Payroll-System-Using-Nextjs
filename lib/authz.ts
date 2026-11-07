import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { can, type Permission } from '@/lib/permissions'

type ApiGuard =
  | { session: Session; error: null }
  | { session: null; error: NextResponse }

// Use at the top of every API handler:
//   const guard = await authorizeApi('payroll:manage')
//   if (guard.error) return guard.error
export async function authorizeApi(permission: Permission): Promise<ApiGuard> {
  const session = await auth()

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!can(session.user.role, permission)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { session, error: null }
}

// Use at the top of every dashboard page. The layout's login check is not
// enough on its own, because layouts do not re-run on client-side navigation.
export async function requirePagePermission(permission: Permission): Promise<Session> {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (!can(session.user.role, permission)) redirect('/dashboard')

  return session
}
