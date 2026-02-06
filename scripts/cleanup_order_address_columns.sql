-- Cleanup script to remove extra address columns from orders table
-- Run this if you previously ran a migration that added city/state/country/postal_code to orders

-- Remove shipping address extra columns (if they exist)
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_city;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_state;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_country;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_postal_code;

-- Remove billing address extra columns (if they exist)
ALTER TABLE orders DROP COLUMN IF EXISTS billing_city;
ALTER TABLE orders DROP COLUMN IF EXISTS billing_state;
ALTER TABLE orders DROP COLUMN IF EXISTS billing_country;
ALTER TABLE orders DROP COLUMN IF EXISTS billing_postal_code;

-- Verify the orders table now only has shipping_address and billing_address columns
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name LIKE '%address%' OR column_name LIKE '%shipping%' OR column_name LIKE '%billing%';
