import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DEMO_READ_ONLY_MESSAGE, isDemoMode } from '@/lib/demo'

// Reachable while a temporary password is still waiting to be changed
const PASSWORD_CHANGE_PATHS = ['/dashboard/account', '/portal/account', '/api/account/password']

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development'

  // style-src allows inline styles because components set style attributes.
  // Scripts, the dangerous half, must carry this request's nonce.
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

// First line of defense: nothing under /dashboard, /portal or /api is reachable
// without a session, including routes added later. Role checks live next to the
// data, in lib/authz.ts.
export default auth((req) => {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isProtected = isApi || /^\/(dashboard|portal)(\/|$)/.test(pathname)

  if (isDemoMode() && isApi && req.method !== 'GET' && req.method !== 'HEAD') {
    return NextResponse.json({ error: DEMO_READ_ONLY_MESSAGE }, { status: 403 })
  }

  if (isProtected && !req.auth) {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isProtected && req.auth?.user.mustChangePassword && !PASSWORD_CHANGE_PATHS.includes(pathname)) {
    if (isApi) {
      return NextResponse.json({ error: 'Change your temporary password first' }, { status: 403 })
    }
    const accountPage = req.auth.user.role === 'CONTRACTOR' ? '/portal/account' : '/dashboard/account'
    return NextResponse.redirect(new URL(accountPage, req.nextUrl))
  }

  if (isApi) return NextResponse.next()

  // Next.js reads the nonce from the request header and adds it to its own scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const policy = contentSecurityPolicy(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('Content-Security-Policy', policy)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
})

export const config = {
  matcher: ['/((?!api/auth/|_next/static|_next/image|favicon.ico).*)'],
}
