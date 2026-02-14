-- Migration to support phone login
-- Allows email to be nullable in profiles table and updates handle_new_user to handle phone

-- 1. Make email nullable in profiles table
ALTER TABLE public.profiles
ALTER COLUMN email DROP NOT NULL;

-- 2. Add phone column constraint if not already unique (it should likely be unique for login)
-- Although auth.users handles uniqueness, good to have on profile if used for lookup
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
-- ^ Skipping unique constraint on profiles.phone for now as it's not strictly necessary if we rely on auth.users for uniqueness and profile is just a mirror.

-- 3. Update handle_new_user function to handle phone signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (
    new.id,
    new.email, -- Can be null for phone signups
    new.phone, -- Will be populated for phone signups
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
