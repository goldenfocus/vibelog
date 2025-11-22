/**
 * Root page - This should not exist because all pages are under [locale]/
 *
 * This file exists as a fallback, but middleware should rewrite all requests
 * to /en/path for English or /locale/path for other languages.
 *
 * If you're seeing this, the middleware rewrite logic needs to be fixed.
 */
export default function RootPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Middleware Configuration Error</h1>
        <p className="text-muted-foreground">
          This page should not be visible. Middleware should rewrite to locale routes.
        </p>
      </div>
    </div>
  );
}
