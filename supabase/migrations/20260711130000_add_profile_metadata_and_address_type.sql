-- Add profile metadata and optional fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signup_source text,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_checkout timestamp with time zone,
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS gender text;

-- Add address type (Home, Work, Other)
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'Home';
