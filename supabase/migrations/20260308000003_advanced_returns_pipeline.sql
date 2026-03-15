-- 1. Add delivered_at to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Update returns table status constraint
-- First, we need to drop the existing constraint if it exists.
-- The name of the constraint is likely related to the column and table name.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.returns'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.returns DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add the new constraint with all pipeline stages
ALTER TABLE public.returns ADD CONSTRAINT returns_status_check 
CHECK (status IN (
    'requested', 
    'approved', 
    'pickup_scheduled', 
    'picked_up', 
    'inspection_pending', 
    'accepted', 
    'rejected', 
    'refund_processed', 
    'exchange_processed'
));

-- (Optional but helpful) Set default status if it was lost during constraint drop
ALTER TABLE public.returns ALTER COLUMN status SET DEFAULT 'requested';
