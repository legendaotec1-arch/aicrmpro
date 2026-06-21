ALTER TABLE price_items ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE price_items ADD COLUMN IF NOT EXISTS price_max DECIMAL(10, 2);

UPDATE price_items SET price_type = 'fixed' WHERE price_type IS NULL;

ALTER TABLE price_items DROP CONSTRAINT IF EXISTS price_items_price_type_check;
ALTER TABLE price_items ADD CONSTRAINT price_items_price_type_check
  CHECK (price_type IN ('fixed', 'from', 'to', 'range'));
