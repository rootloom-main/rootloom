-- RPC to increment stock safely
CREATE OR REPLACE FUNCTION increment_stock(variant_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock = stock + qty
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
