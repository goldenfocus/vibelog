-- Add bio and header_image to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS header_image text;

-- Add index for bio search if needed
CREATE INDEX IF NOT EXISTS profiles_bio_idx ON public.profiles USING gin(to_tsvector('english', bio));
