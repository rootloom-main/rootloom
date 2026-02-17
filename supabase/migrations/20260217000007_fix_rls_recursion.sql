-- Create a security definer function to check admin status without triggering RLS recursion
-- This function runs with the privileges of the creator (postgres), bypassing RLS on the tables it queries.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$;

-- Update Profiles Policies to use the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Update Products Policies
-- Drop existing policies first to be safe
DROP POLICY IF EXISTS "Products are insertable by admins only" ON products;
CREATE POLICY "Products are insertable by admins only" ON products
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Products are updatable by admins only" ON products;
CREATE POLICY "Products are updatable by admins only" ON products
  FOR UPDATE USING (is_admin());

-- Update Orders Policies
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (is_admin());
