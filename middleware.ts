import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextRequest, NextResponse } from 'next/server';

// Supported locales for VibeLog
const SUPPORTED_LOCALES = ['en', 'vi', 'es', 'fr', 'de', 'zh'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'en';

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
  '/lab',
]);

/**
 * Intelligent locale detection with fallback chain:
 * 1. URL path locale (highest priority)
 * 2. Cookie preference (user's saved choice)
 * 3. Accept-Language header (browser preference)
 * 4. Default locale (en)
 */
function getLocale(request: NextRequest): Locale {
  const pathname = request.nextUrl.pathname;

  // 1. Check if URL already has a locale prefix
  const pathnameLocale = SUPPORTED_LOCALES.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameLocale) {
    return pathnameLocale;
  }

  // 2. Check cookie (user preference from language switcher)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  // 3. Check Accept-Language header (browser preference)
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    try {
      const headers = { 'accept-language': acceptLanguage };
      const languages = new Negotiator({ headers }).languages();
      const detectedLocale = match(languages, [...SUPPORTED_LOCALES], DEFAULT_LOCALE);
      return detectedLocale as Locale;
    } catch (error) {
      // Fallback to default if locale matching fails
      console.warn('Locale detection failed:', error);
    }
  }

  // 4. Default locale
  return DEFAULT_LOCALE;
}

/**
 * Check if pathname has a locale prefix
 */
function pathnameHasLocale(pathname: string): boolean {
  return SUPPORTED_LOCALES.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

/**
 * Extract locale from pathname if present
 */
function getLocaleFromPathname(pathname: string): Locale | null {
  const locale = SUPPORTED_LOCALES.find(
    loc => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );
  return locale || null;
}

/**
 * Strip locale prefix from pathname
 */
function stripLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) {
    return pathname;
  }

  if (pathname === `/${locale}`) {
    return '/';
  }
  return pathname.slice(`/${locale}`.length);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for:
  // - API routes
  // - Next.js internals (_next)
  // - Static files (contains .)
  // - Favicon
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    (pathname.includes('.') && !pathname.includes('/@'))
  ) {
    return NextResponse.next();
  }

  // Block internal lab routes in production
  if (process.env.NODE_ENV === 'production') {
    for (const base of LAB_ROUTES) {
      const pathWithoutLocale = stripLocalePrefix(pathname);
      if (pathWithoutLocale === base || pathWithoutLocale.startsWith(`${base}/`)) {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  // Detect user's preferred locale
  const detectedLocale = getLocale(req);
  const hasLocale = pathnameHasLocale(pathname);
  const pathLocale = getLocaleFromPathname(pathname);

  // If no locale in URL and user prefers non-default locale, redirect
  // BUT: Only redirect if this is a first visit (Accept-Language based detection)
  // If user has explicitly navigated to a no-locale URL, respect that as English
  if (!hasLocale && detectedLocale !== DEFAULT_LOCALE) {
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;

    // Only auto-redirect if preference comes from Accept-Language header, not cookie
    // This prevents redirecting users who explicitly clicked "English" in language switcher
    if (!cookieLocale) {
      // First visit - redirect based on browser language
      const url = req.nextUrl.clone();
      url.pathname = `/${detectedLocale}${pathname}`;
      const response = NextResponse.redirect(url);
      response.cookies.set('NEXT_LOCALE', detectedLocale, {
        maxAge: 31536000, // 1 year
        path: '/',
      });
      return response;
    }
    // If cookie exists and user is on clean URL, treat as English
    // (don't redirect - just fall through to English rewrite below)
  }

  // Get the clean pathname (without locale prefix)
  const cleanPathname = stripLocalePrefix(pathname);
  const currentLocale = pathLocale || detectedLocale;

  // Handle /v/slug -> /@anonymous/slug redirect (preserve locale)
  if (cleanPathname.startsWith('/v/')) {
    const slug = cleanPathname.slice(3); // Remove '/v/'
    if (slug) {
      const url = req.nextUrl.clone();
      const newPath = `/@anonymous/${slug}`;
      url.pathname = currentLocale !== DEFAULT_LOCALE ? `/${currentLocale}${newPath}` : newPath;
      return NextResponse.redirect(url, 301);
    }
  }

  // Rewrite /@username to /username internally (browser shows @, Next.js routes without @)
  // CRITICAL: Handle this BEFORE general locale rewrite to ensure @ is stripped first
  if (cleanPathname.startsWith('/@')) {
    const url = req.nextUrl.clone();
    const internalPath = cleanPathname.replace(/^\/@/, '/');
    // Always include locale in rewrite path to match [locale]/[username] structure
    url.pathname = `/${currentLocale}${internalPath}`;
    const response = NextResponse.rewrite(url);
    response.cookies.set('NEXT_LOCALE', currentLocale, {
      maxAge: 31536000,
      path: '/',
    });
    return response;
  }

  if (!hasLocale) {
    const isProfileUrl = cleanPathname.match(/^\/@[^/]+$/);

    // Profile URLs: Keep clean for easy sharing (vibelog.io/@user)
    if (isProfileUrl) {
      const url = req.nextUrl.clone();
      url.pathname = `/${detectedLocale}${pathname}`;
      const response = NextResponse.rewrite(url);
      response.cookies.set('NEXT_LOCALE', detectedLocale, {
        maxAge: 31536000,
        path: '/',
      });
      return response;
    }

    // All other URLs: Redirect to explicit locale prefix for SEO
    const url = req.nextUrl.clone();
    url.pathname = `/${detectedLocale}${pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set('NEXT_LOCALE', detectedLocale, {
      maxAge: 31536000,
      path: '/',
    });
    return response;
  }

  // Redirect /username to /@username (301 permanent redirect, preserve locale)
  // Only redirect if:
  // 1. Path starts with / but NOT with /@
  // 2. It's not a known app route
  // 3. It's not a file (has no extension)
  const firstSegment = cleanPathname.split('/').filter(Boolean)[0];
  if (
    cleanPathname.startsWith('/') &&
    !cleanPathname.startsWith('/@') &&
    firstSegment &&
    !APP_ROUTES.has(`/${firstSegment}`) &&
    !cleanPathname.includes('.')
  ) {
    const segments = cleanPathname.split('/').filter(Boolean);
    // Only redirect single-segment paths (username) or two-segment paths (username/slug)
    if (segments.length > 0 && segments.length <= 2) {
      const url = req.nextUrl.clone();
      const newPath = `/@${segments.join('/')}`;
      url.pathname = currentLocale !== DEFAULT_LOCALE ? `/${currentLocale}${newPath}` : newPath;
      return NextResponse.redirect(url, 301);
    }
  }

  // Set locale cookie for all requests
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', currentLocale, {
    maxAge: 31536000,
    path: '/',
  });

  // Pass pathname to layout via headers for locale detection
  response.headers.set('x-pathname', pathname);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. robots.txt)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav)$).*)',
  ],
};
