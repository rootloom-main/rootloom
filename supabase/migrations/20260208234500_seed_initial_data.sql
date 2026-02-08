DO $$
DECLARE
  men_id uuid;
  women_id uuid;
  acc_id uuid;
  foot_id uuid;
BEGIN
  -- 1. Insert Categories
  INSERT INTO categories (name, slug, description, image_url)
  VALUES 
  ('Men', 'men', 'Timeless fashion for the modern man.', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop'),
  ('Women', 'women', 'Elegant and contemporary styles for women.', 'https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?q=80&w=1974&auto=format&fit=crop'),
  ('Accessories', 'accessories', 'Complete your look with our curated accessories.', 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=2070&auto=format&fit=crop'),
  ('Footwear', 'footwear', 'Step out in style with our premium footwear.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop')
  ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description;

  -- Get Category IDs
  SELECT id INTO men_id FROM categories WHERE slug = 'men';
  SELECT id INTO women_id FROM categories WHERE slug = 'women';
  SELECT id INTO acc_id FROM categories WHERE slug = 'accessories';
  SELECT id INTO foot_id FROM categories WHERE slug = 'footwear';

  -- 2. Insert Products (Men)
  -- Product 1
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('Classic Oxford Shirt', 'classic-oxford-shirt', 'A crisp, breathable cotton Oxford shirt perfect for any occasion.', men_id, 2499, true)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1888&auto=format&fit=crop', 'Classic Oxford Shirt Front', 0
  FROM p;

  -- Product 2
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('Slim Fit Chinos', 'slim-fit-chinos', 'Versatile chinos made from stretch cotton fabric.', men_id, 3299, false)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1897&auto=format&fit=crop', 'Slim Fit Chinos Beige', 0
  FROM p;

  -- 3. Insert Products (Women)
  -- Product 3
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('Floral Summer Dress', 'floral-summer-dress', 'Lightweight and airy dress with a beautiful floral print.', women_id, 3999, true)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=1946&auto=format&fit=crop', 'Floral Summer Dress', 0
  FROM p;

  -- Product 4
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('High-Waist Jeans', 'high-waist-jeans', 'Classic denim with a flattering high-waist fit.', women_id, 2999, false)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1973&auto=format&fit=crop', 'High Waist Jeans', 0
  FROM p;

  -- 4. Insert Products (Accessories)
  -- Product 5
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('Leather Tote Bag', 'leather-tote-bag', 'Premium leather tote with ample space for essentials.', acc_id, 5999, true)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1935&auto=format&fit=crop', 'Leather Tote Bag', 0
  FROM p;

  -- 5. Insert Products (Footwear)
  -- Product 6
  WITH p AS (
    INSERT INTO products (name, slug, description, category_id, base_price, featured)
    VALUES ('Classic White Sneakers', 'classic-white-sneakers', 'Minimalist white sneakers for everyday comfort.', foot_id, 4599, true)
    ON CONFLICT (slug) DO UPDATE SET base_price = EXCLUDED.base_price
    RETURNING id
  )
  INSERT INTO product_images (product_id, image_url, alt_text, display_order)
  SELECT id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop', 'Classic White Sneakers', 0
  FROM p;

END $$;
