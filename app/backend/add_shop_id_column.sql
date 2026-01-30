-- Add shop_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id INTEGER DEFAULT 1 NOT NULL;

-- Update existing products with shop_id
UPDATE products SET shop_id = CASE 
    WHEN id % 2 = 1 THEN 1 
    ELSE 2 
END;