-- ============================================================================
-- Himbyte — canonical full schema (FRESH empty database ONLY)
--
-- Run once on a new Postgres/Supabase project. Do not run after 001–010.
-- See README.md in this folder for migration strategy.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums (idempotent) ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'restaurant_admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'approved', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_status AS ENUM ('requested', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('table', 'room');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Core tenant ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  vat_pan_number TEXT,
  is_active BOOLEAN DEFAULT true,
  venue_type TEXT DEFAULT 'restaurant' CHECK (venue_type IN ('restaurant', 'hotel')),
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_service_category BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_restaurant_name
  ON categories (restaurant_id, name);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_restaurant_name
  ON menu_items (restaurant_id, name);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category ON menu_items (restaurant_id, category_id);

CREATE TABLE IF NOT EXISTS tables_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  type location_type NOT NULL DEFAULT 'table',
  qr_code_url TEXT,
  running_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, identifier)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_room_id UUID REFERENCES tables_rooms(id),
  status order_status NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  session_id TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_time DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_room_id UUID REFERENCES tables_rooms(id),
  service_type TEXT NOT NULL,
  status service_status NOT NULL DEFAULT 'requested',
  notes TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_requests REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id TEXT,
  guest_email TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL,
  vat_rate NUMERIC(8, 6) NOT NULL DEFAULT 0.13,
  vat_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  pan_display TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_restaurant_created ON receipts (restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  description TEXT,
  amount_due NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  hire_date DATE,
  salary_amount NUMERIC(12, 2),
  salary_period TEXT DEFAULT 'monthly' CHECK (salary_period IN ('monthly', 'daily')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT employee_shifts_same_day CHECK (start_time < end_time)
);

-- ── Row Level Security (tenant isolation) ─────────────────────────────────
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

-- Minimal tenant policies (service role bypasses; anon uses insert policies where needed)
DROP POLICY IF EXISTS restaurants_tenant_select ON restaurants;
CREATE POLICY restaurants_tenant_select ON restaurants FOR SELECT USING (
  id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS menu_items_public_read ON menu_items;
CREATE POLICY menu_items_public_read ON menu_items FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS orders_anon_insert ON orders;
CREATE POLICY orders_anon_insert ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS order_items_anon_insert ON order_items;
CREATE POLICY order_items_anon_insert ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS service_requests_anon_insert ON service_requests;
CREATE POLICY service_requests_anon_insert ON service_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS receipts_service_insert ON receipts;
CREATE POLICY receipts_service_insert ON receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS vendors_tenant ON vendors;
CREATE POLICY vendors_tenant ON vendors FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS vendor_payables_tenant ON vendor_payables;
CREATE POLICY vendor_payables_tenant ON vendor_payables FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS employees_tenant ON employees;
CREATE POLICY employees_tenant ON employees FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS employment_history_tenant ON employment_history;
CREATE POLICY employment_history_tenant ON employment_history FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS employee_shifts_tenant ON employee_shifts;
CREATE POLICY employee_shifts_tenant ON employee_shifts FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ── Storage: menu images bucket ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Restaurant staff upload menu images" ON storage.objects;
CREATE POLICY "Restaurant staff upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Restaurant staff update menu images" ON storage.objects;
CREATE POLICY "Restaurant staff update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Restaurant staff delete menu images" ON storage.objects;
CREATE POLICY "Restaurant staff delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

-- ── Realtime (Supabase) ───────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
