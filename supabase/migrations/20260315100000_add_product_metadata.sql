
-- Migration: Add metadata column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update existing search RPC to include new column if necessary (usually not needed for * select, but good to check)
-- Actually, the select in ProductService is `*`, so it will automatically pick up the new column.
