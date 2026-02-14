-- Allow Admins to read all addresses
DROP POLICY IF EXISTS "Admins can read all addresses" ON addresses;
CREATE POLICY "Admins can read all addresses" ON addresses FOR SELECT TO authenticated USING (is_admin());

-- Allow Admins to manage reviews
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL TO authenticated USING (is_admin());
