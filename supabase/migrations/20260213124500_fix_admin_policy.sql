-- Create a function to check if the user is an admin
-- SECURITY DEFINER ensures it runs with the privileges of the creator (postgres/superuser)
-- preventing infinite recursion when querying the profiles table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Create the new policy using the function
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());
