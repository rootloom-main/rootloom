-- Add foreign key relationship between returns and profiles
-- This allows PostGrest to join returns with profiles data
ALTER TABLE public.returns
DROP CONSTRAINT IF EXISTS returns_user_id_fkey,
ADD CONSTRAINT returns_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- If there isn't a foreign key to order_items, detect and add it too (optional but good)
-- Based on error trace, order_items join seems to be working, so we'll focus on profiles.
