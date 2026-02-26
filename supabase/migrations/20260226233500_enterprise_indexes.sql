-- Enterprise Performance Indexes

-- 1. Index for Categories Filtering
-- Dramatically speeds up /shop?category=uuid by targeting category_id in products table
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 2. Index for User Orders
-- Speeds up /account page loads where orders are queried by user_id
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- 3. Unique Index for Order Tracking Number
-- Accelerates individual order lookups for shipping integration
CREATE INDEX IF NOT EXISTS idx_order_number ON orders(order_number);



-- 5. Index for User Cart Items
-- Accelerates cart population logic across sessions
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- 6. Full-Text Search Vector Expansion (if tsvector used)
-- Accelerates Supabase native text search on the products table
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING GIN (to_tsvector('english', name));
