-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can view, only admins can modify
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are insertable by admins only" ON products;
CREATE POLICY "Products are insertable by admins only" ON products
  FOR INSERT WITH CHECK (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Products are updatable by admins only" ON products;
CREATE POLICY "Products are updatable by admins only" ON products
  FOR UPDATE USING (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Profiles: Users can view their own, Admins can view all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Cart: Users can manipulate their own cart items
DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
CREATE POLICY "Users can view own cart" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into own cart" ON cart_items;
CREATE POLICY "Users can insert into own cart" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON cart_items;
CREATE POLICY "Users can update own cart" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Orders: Users view own, Admins view all
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Note: Complex policies regarding order creation/updates might need Functions/Triggers
