-- Add reserved_quantity column if it doesn't exist
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS reserved_quantity integer DEFAULT 0;

-- Function to atomically reserve stock for a batch of items
CREATE OR REPLACE FUNCTION reserve_stock_batch(items jsonb)
RETURNS boolean AS $$
DECLARE
    item jsonb;
    v_id uuid;
    v_qty integer;
    v_stock integer;
    v_reserved integer;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        v_id := (item->>'variant_id')::uuid;
        v_qty := (item->>'quantity')::integer;
        
        -- Lock the row to prevent race conditions during checkout
        SELECT stock, reserved_quantity INTO v_stock, v_reserved
        FROM product_variants
        WHERE id = v_id
        FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant % not found', v_id;
        END IF;
        
        IF (v_stock - v_reserved) < v_qty THEN
            RAISE EXCEPTION 'Not enough stock for variant %', v_id;
        END IF;
        
        UPDATE product_variants
        SET reserved_quantity = reserved_quantity + v_qty
        WHERE id = v_id;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release reserved stock (e.g. on payment failure/abandonment)
CREATE OR REPLACE FUNCTION release_stock_batch(items jsonb)
RETURNS boolean AS $$
DECLARE
    item jsonb;
    v_id uuid;
    v_qty integer;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        v_id := (item->>'variant_id')::uuid;
        v_qty := (item->>'quantity')::integer;
        
        UPDATE product_variants
        SET reserved_quantity = GREATEST(0, reserved_quantity - v_qty)
        WHERE id = v_id;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently commit stock (reduce actual stock, release reservation) upon success
CREATE OR REPLACE FUNCTION commit_stock_batch(items jsonb)
RETURNS boolean AS $$
DECLARE
    item jsonb;
    v_id uuid;
    v_qty integer;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        v_id := (item->>'variant_id')::uuid;
        v_qty := (item->>'quantity')::integer;
        
        UPDATE product_variants
        SET 
            stock = GREATEST(0, stock - v_qty),
            reserved_quantity = GREATEST(0, reserved_quantity - v_qty)
        WHERE id = v_id;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Standard atomic increment/decrement without reservation (for COD / manual adjustments if needed)
CREATE OR REPLACE FUNCTION decrement_stock_batch(items jsonb)
RETURNS boolean AS $$
DECLARE
    item jsonb;
    v_id uuid;
    v_qty integer;
    v_stock integer;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        v_id := (item->>'variant_id')::uuid;
        v_qty := (item->>'quantity')::integer;
        
        SELECT stock INTO v_stock
        FROM product_variants
        WHERE id = v_id
        FOR UPDATE;
        
        IF NOT FOUND OR v_stock < v_qty THEN
            RAISE EXCEPTION 'Not enough stock for variant %', v_id;
        END IF;
        
        UPDATE product_variants
        SET stock = stock - v_qty
        WHERE id = v_id;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
