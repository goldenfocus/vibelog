import { NextRequest, NextResponse } from 'next/server';

// Block internal lab routes in production
const LAB_ROUTES = new Set(['/mic-lab', '/transcript-lab', '/processing-lab', '/publish-lab']);

// App routes that should NOT be redirected to /@username format
const APP_ROUTES = new Set([
  '/about',
  '/admin',
  '/api',
  '/auth',
  '/community',
  '/dashboard',
  '/faq',
  '/people',
  '/pricing',
  '/settings',
  '/v',
  '/vibelogs',
  '/mic-lab',
  '/transcript-lab',
  '/processing-lab',
  '/publish-lab',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block internal lab routes in production
  if (process.env.NODE_ENV === 'production') {
    for (const base of LAB_ROUTES) {
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect /v/slug to /@anonymous/slug (301 permanent redirect)
  if (pathname.startsWith('/v/')) {
    const slug = pathname.slice(3); // Remove '/v/'
    if (slug) {
      const url = req.nextUrl.clone();
      url.pathname = `/@anonymous/${slug}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // Rewrite /@username to /username internally (browser shows @, Next.js routes without @)
  if (pathname.startsWith('/@')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/@/, '/'); // Replace /@ with /
    return NextResponse.rewrite(url);
  }

  // Redirect /username to /@username (301 permanent redirect)
  // Only redirect if:
  // 1. Path starts with / but NOT with /@
  // 2. It's not a known app route
  // 3. It's not a file (has no extension)
  if (
    pathname.startsWith('/') &&
    !pathname.startsWith('/@') &&
    !pathname.startsWith('/_next') &&
    !APP_ROUTES.has(pathname.split('/')[1] ? `/${pathname.split('/')[1]}` : pathname) &&
    !pathname.includes('.')
  ) {
    const segments = pathname.split('/').filter(Boolean);
    // Only redirect single-segment paths (username) or two-segment paths (username/slug)
    if (segments.length > 0 && segments.length <= 2) {
      const url = req.nextUrl.clone();
      url.pathname = `/@${segments.join('/')}`;
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/mic-lab/:path*',
    '/transcript-lab/:path*',
    '/processing-lab/:path*',
    '/publish-lab/:path*',
    '/v/:path*',
    '/:username',
    '/:username/:slug',
    '/@:username',
    '/@:username/:slug',
  ],
};
