-- Temporarily disable RLS for rate_limits table to fix API issues
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- Ensure covers bucket exists and is public
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vibelog-covers', 'vibelog-covers', true) ON CONFLICT (id) DO NOTHING;