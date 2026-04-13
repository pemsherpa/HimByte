-- Add unique constraints needed by seed.js upsert operations
-- and add missing columns used by the seed/app if not present.

-- Categories: unique(restaurant_id, name) for upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_restaurant_name
  ON categories (restaurant_id, name);

-- Menu items: unique(restaurant_id, name) for upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_restaurant_name
  ON menu_items (restaurant_id, name);

-- Add is_service_category column if missing (seed uses it; schema uses context)
DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN is_service_category BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add priority column if missing (seed uses it; schema has sort_order)
DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN priority INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Orders: add columns the app depends on if not present
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN table_room_id UUID REFERENCES tables_rooms(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN session_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN guest_phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN guest_email TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Tables_rooms: add running_total if missing
DO $$ BEGIN
  ALTER TABLE tables_rooms ADD COLUMN running_total NUMERIC(12,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Order_items: ensure price_at_time column exists
DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN price_at_time DECIMAL(10,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
