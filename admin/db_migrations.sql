-- Root & Loom Enterprise DB Migrations
-- Run this directly in your Supabase SQL Editor

-- 1. Prevent duplicate orders from webhook retries
ALTER TABLE orders 
ADD CONSTRAINT unique_payment_id UNIQUE (payment_id);

-- 2. Prevent inventory from ever dipping below zero (race conditions)
ALTER TABLE product_variants 
ADD CONSTRAINT positive_stock CHECK (stock >= 0);

-- NOTE: If the second constraint fails, it means you CURRENTLY have variants with negative stock.
-- You must fix them before applying the constraint:
-- UPDATE product_variants SET stock = 0 WHERE stock < 0;
