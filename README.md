This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Security Profile

- Rate limiting (API): stored in Supabase (Postgres)
  - Logged-in users: 3 requests per 15 minutes per endpoint
  - Anonymous users (by IP): 1 request per minute per endpoint
  - Supabase table tracks per-actor counters with `reset_at`; in dev, falls back to in‑memory.

- Server‑only Supabase admin client:
  - `lib/supabaseAdmin.ts` exposes `createServerAdminClient()` and is guarded by `server-only`.
  - Do not import admin client from client components.

- Safer content rendering:
  - AI blog output is rendered via Markdown with sanitization (react-markdown + rehype-sanitize).

- Security headers (set via `next.config.ts`):
  - CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP.
  - In production, CSP removes `'unsafe-eval'`.

- Internal labs hidden in production:
  - `/mic-lab`, `/transcript-lab`, `/processing-lab`, `/publish-lab` blocked by `middleware.ts` when `NODE_ENV=production`.

### Database Setup (Rate Limit)

Create a `rate_limits` table in Supabase (SQL example):

```
create table if not exists public.rate_limits (
  key text not null,
  ip text not null,
  window_seconds integer not null default 60,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, ip)
);

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);
```

Optional RLS (if you want to enable RLS on this table):

```
alter table public.rate_limits enable row level security;
create policy "server can manage rate limits" on public.rate_limits
  for all to service_role using (true) with check (true);
```

### Environment Variables

Set these in your environment or Vercel project:

```
# OpenAI
OPENAI_API_KEY="sk-..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xyzcompany.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"  # server only
```

If the table is missing or Supabase is unreachable, the limiter falls back to an in‑memory store (suitable for local dev only).

### Supabase Schema

For convenience, a full SQL schema is provided at `supabase/schema.sql`:

- Creates `public.rate_limits` with indexes and optional RLS for service role access.
- Creates `public.vibelogs` with sensible defaults and Row Level Security policies so users can insert/read/update their own content and the public can read published posts.

Apply in the Supabase SQL editor or via CLI:

```
# Using psql (replace connection string with your project)
psql "$SUPABASE_DB_URL" -f supabase/schema.sql

# Or paste the contents of supabase/schema.sql into the Supabase SQL editor and run
```

Note: This app uses Supabase for auth and data access; Prisma has been removed.
