-- Remove any products or categories related to "Boult"
DELETE FROM product_variants 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Boult%' OR description ILIKE '%Boult%');

DELETE FROM product_images 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Boult%' OR description ILIKE '%Boult%');

DELETE FROM products 
WHERE name ILIKE '%Boult%' OR description ILIKE '%Boult%';

DELETE FROM categories 
WHERE name ILIKE '%Boult%' OR description ILIKE '%Boult%';
