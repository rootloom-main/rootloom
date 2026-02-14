-- Add FK from orders to profiles to enable joins
ALTER TABLE orders
ADD CONSTRAINT fk_orders_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add FK from addresses to profiles to enable joins
ALTER TABLE addresses
ADD CONSTRAINT fk_addresses_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Update Policies to use is_admin() for efficiency
-- Orders
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
CREATE POLICY "Admins can read all orders" ON orders FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (is_admin());

-- Order Items
DROP POLICY IF EXISTS "Admins can read all order items" ON order_items;
CREATE POLICY "Admins can read all order items" ON order_items FOR SELECT TO authenticated USING (is_admin());

-- Products
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products FOR ALL TO authenticated USING (is_admin());

-- Categories
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (is_admin());

-- Product Variants
DROP POLICY IF EXISTS "Admins can manage product variants" ON product_variants;
CREATE POLICY "Admins can manage product variants" ON product_variants FOR ALL TO authenticated USING (is_admin());

-- Product Images
DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images" ON product_images FOR ALL TO authenticated USING (is_admin());
