-- Add sales_count column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0;

-- Index for faster sorting by sales
CREATE INDEX IF NOT EXISTS idx_products_sales_count ON products(sales_count);
