// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function forceHTTPS(req: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') !== 'https' &&
    !req.headers.get('host')?.includes('localhost')
  ) {
    return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}`, 301)
  }
}

export function middleware(request: NextRequest) {
  const httpsRedirect = forceHTTPS(request)

  if (httpsRedirect) {
    return httpsRedirect
  }

  return NextResponse.next()
}
