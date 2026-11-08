import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import type { Contractor } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

type PortalContractor = Omit<Contractor, 'taxId'>

type PortalGuard =
  | { session: Session; contractor: PortalContractor; error: null }
  | { session: null; contractor: null; error: NextResponse }

// Portal handlers take the contractor from the session, never from the request,
// so one contractor cannot reach another's records by changing an id.
export async function authorizePortalApi(): Promise<PortalGuard> {
  const guard = await authorizeApi('portal:access')
  if (guard.error) return { session: null, contractor: null, error: guard.error }

  const contractor = await prisma.contractor.findUnique({
    where: { userId: guard.session.user.id },
  })

  if (!contractor) {
    return {
      session: null,
      contractor: null,
      error: NextResponse.json(
        { error: 'This login is not linked to a contractor profile' },
        { status: 403 }
      ),
    }
  }

  return { session: guard.session, contractor, error: null }
}

export async function requirePortalContractor() {
  const session = await requirePagePermission('portal:access')
  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
  })

  if (!contractor) redirect('/portal/not-linked')

  return { session, contractor }
}
