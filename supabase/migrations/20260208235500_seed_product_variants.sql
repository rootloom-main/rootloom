DO $$
DECLARE
  p_oxford_id uuid;
  p_chinos_id uuid;
  p_dress_id uuid;
  p_jeans_id uuid;
  p_tote_id uuid;
  p_sneakers_id uuid;
BEGIN
  -- Retrieve Product IDs based on slugs
  SELECT id INTO p_oxford_id FROM products WHERE slug = 'classic-oxford-shirt';
  SELECT id INTO p_chinos_id FROM products WHERE slug = 'slim-fit-chinos';
  SELECT id INTO p_dress_id FROM products WHERE slug = 'floral-summer-dress';
  SELECT id INTO p_jeans_id FROM products WHERE slug = 'high-waist-jeans';
  SELECT id INTO p_tote_id FROM products WHERE slug = 'leather-tote-bag';
  SELECT id INTO p_sneakers_id FROM products WHERE slug = 'classic-white-sneakers';

  -- 1. Variants for Classic Oxford Shirt (Men)
  IF p_oxford_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_oxford_id, 'S', 'White', 10, 0, 'OXFORD-WHT-S'),
      (p_oxford_id, 'M', 'White', 15, 0, 'OXFORD-WHT-M'),
      (p_oxford_id, 'L', 'White', 20, 0, 'OXFORD-WHT-L'),
      (p_oxford_id, 'M', 'Blue', 12, 0, 'OXFORD-BLU-M'),
      (p_oxford_id, 'L', 'Blue', 18, 0, 'OXFORD-BLU-L')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 2. Variants for Slim Fit Chinos (Men)
  IF p_chinos_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_chinos_id, '30', 'Beige', 10, 0, 'CHINO-BGE-30'),
      (p_chinos_id, '32', 'Beige', 15, 0, 'CHINO-BGE-32'),
      (p_chinos_id, '34', 'Beige', 12, 0, 'CHINO-BGE-34'),
      (p_chinos_id, '32', 'Navy', 14, 0, 'CHINO-NVY-32'),
      (p_chinos_id, '34', 'Navy', 10, 0, 'CHINO-NVY-34')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 3. Variants for Floral Summer Dress (Women)
  IF p_dress_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_dress_id, 'XS', 'Floral', 8, 0, 'DRESS-FLR-XS'),
      (p_dress_id, 'S', 'Floral', 12, 0, 'DRESS-FLR-S'),
      (p_dress_id, 'M', 'Floral', 15, 0, 'DRESS-FLR-M'),
      (p_dress_id, 'L', 'Floral', 10, 0, 'DRESS-FLR-L')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 4. Variants for High-Waist Jeans (Women)
  IF p_jeans_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_jeans_id, '26', 'Light Blue', 10, 0, 'JEANS-LBL-26'),
      (p_jeans_id, '28', 'Light Blue', 15, 0, 'JEANS-LBL-28'),
      (p_jeans_id, '30', 'Light Blue', 12, 0, 'JEANS-LBL-30')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 5. Variants for Leather Tote Bag (Accessories - One Size)
  IF p_tote_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_tote_id, 'One Size', 'Brown', 20, 0, 'TOTE-BRN-OS'),
      (p_tote_id, 'One Size', 'Black', 15, 0, 'TOTE-BLK-OS')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 6. Variants for Classic White Sneakers (Footwear)
  IF p_sneakers_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, size, color, stock, price_adjustment, sku)
    VALUES 
      (p_sneakers_id, '7', 'White', 10, 0, 'SNEAKER-WHT-7'),
      (p_sneakers_id, '8', 'White', 15, 0, 'SNEAKER-WHT-8'),
      (p_sneakers_id, '9', 'White', 20, 0, 'SNEAKER-WHT-9'),
      (p_sneakers_id, '10', 'White', 12, 0, 'SNEAKER-WHT-10')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

END $$;
