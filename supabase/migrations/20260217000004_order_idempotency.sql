-- Fix duplicate payment_ids for COD orders before adding constraint
UPDATE orders 
SET payment_id = 'COD_' || id 
WHERE payment_id = 'COD';

-- Add unique constraint to payment_id to prevent duplicate orders
DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_id_key UNIQUE (payment_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
