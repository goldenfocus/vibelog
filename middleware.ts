import { NextRequest, NextResponse } from 'next/server'

// Block internal lab routes in production
const LAB_ROUTES = new Set(['/mic-lab', '/transcript-lab', '/processing-lab', '/publish-lab'])

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const { pathname } = req.nextUrl
    for (const base of LAB_ROUTES) {
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        const url = req.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/mic-lab/:path*', '/transcript-lab/:path*', '/processing-lab/:path*', '/publish-lab/:path*'],
}

