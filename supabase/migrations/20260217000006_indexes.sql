-- Add indexes for performance optimization

-- Orders: Frequent lookups by user and order number
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Order Items: Lookups by order and product (for analytics/restocking)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Product Variants: Lookups by product (product page load)
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Cart Items: Lookups by user (cart load)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
