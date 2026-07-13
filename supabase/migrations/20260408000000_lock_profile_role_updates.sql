-- Prevent end-users from changing their own role while still allowing profile edits.
CREATE OR REPLACE FUNCTION public.can_update_own_profile(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RETURN false;
  END IF;

  SELECT role INTO current_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN current_role IS NOT NULL AND current_role = new_role;
END;
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (public.can_update_own_profile(id, role));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
