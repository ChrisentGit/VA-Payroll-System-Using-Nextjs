import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// First line of defense: nothing under /dashboard, /portal or /api is reachable
// without a session, including routes added later. Role checks live next to the
// data, in lib/authz.ts.
export default auth((req) => {
  if (req.auth) return NextResponse.next()

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', req.nextUrl))
})

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/api/((?!auth/).*)'],
}
