-- Himbyte OS: Initial Schema
-- Multi-tenant Restaurant & Hotel Management System

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'restaurant_admin', 'staff', 'kitchen', 'customer');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'preparing', 'ready', 'served', 'rejected', 'cancelled');
CREATE TYPE order_type AS ENUM ('dine_in', 'room_service', 'housekeeping');
CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'overdue', 'suspended', 'cancelled');
CREATE TYPE service_request_type AS ENUM ('clean_room', 'towels', 'dnd', 'other');
CREATE TYPE qr_context AS ENUM ('table', 'room');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  phone TEXT,
  restaurant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RESTAURANTS (tenants)
-- ============================================

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  address TEXT,
  city TEXT DEFAULT 'Kathmandu',
  phone TEXT,
  email TEXT,
  
  -- Nepal compliance
  vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
  pan_number TEXT,
  
  -- Subscription
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Settings
  currency TEXT DEFAULT 'NPR',
  timezone TEXT DEFAULT 'Asia/Kathmandu',
  is_hotel BOOLEAN DEFAULT FALSE,
  
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from profiles back to restaurants
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_restaurant
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

-- ============================================
-- TABLES & ROOMS (QR targets)
-- ============================================

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INT DEFAULT 4,
  qr_code TEXT,
  is_occupied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INT DEFAULT 1,
  room_type TEXT DEFAULT 'standard',
  qr_code TEXT,
  is_occupied BOOLEAN DEFAULT FALSE,
  dnd_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, room_number)
);

-- ============================================
-- MENU CATEGORIES
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ne TEXT, -- Nepali name
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  context qr_context DEFAULT 'table', -- table menu vs room service
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MENU ITEMS
-- ============================================

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ne TEXT, -- Nepali name
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  happy_hour_price DECIMAL(10, 2),
  image_url TEXT,
  
  -- Attributes
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  spice_level INT DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 5),
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  preparation_time INT DEFAULT 15, -- minutes
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- Context
  order_type order_type NOT NULL DEFAULT 'dine_in',
  table_id UUID REFERENCES tables(id),
  room_id UUID REFERENCES rooms(id),
  
  -- Status flow: pending -> approved -> preparing -> ready -> served
  status order_status NOT NULL DEFAULT 'pending',
  
  -- Customer (anonymous for QR orders)
  customer_name TEXT,
  customer_phone TEXT,
  session_id TEXT, -- browser session for anonymous tracking
  
  -- Financials
  subtotal DECIMAL(10, 2) DEFAULT 0,
  vat_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  
  special_instructions TEXT,
  
  -- Staff
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  special_instructions TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SERVICE REQUESTS (Hotel: Towels, Cleaning, DND)
-- ============================================

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  request_type service_request_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  session_id TEXT,
  handled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_menu_items_restaurant_category ON menu_items(restaurant_id, category_id);
CREATE INDEX idx_categories_restaurant ON categories(restaurant_id);
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_rooms_restaurant ON rooms(restaurant_id);
CREATE INDEX idx_service_requests_restaurant ON service_requests(restaurant_id, status);
CREATE INDEX idx_profiles_restaurant ON profiles(restaurant_id);

-- ============================================
-- ROW LEVEL SECURITY (Multi-Tenancy)
-- ============================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Super admins see everything
CREATE POLICY "super_admin_all" ON restaurants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Restaurant data is visible to its members
CREATE POLICY "restaurant_member_read" ON restaurants FOR SELECT
  USING (
    id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Categories: public read for active items, write for restaurant staff
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "categories_restaurant_write" ON categories FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Menu items: public read for available items
CREATE POLICY "menu_items_public_read" ON menu_items FOR SELECT
  USING (is_available = TRUE);

CREATE POLICY "menu_items_restaurant_write" ON menu_items FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Orders: restaurant staff can see their restaurant's orders
CREATE POLICY "orders_restaurant_access" ON orders FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Anonymous order creation (using service role key on backend)
CREATE POLICY "orders_anon_insert" ON orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "orders_anon_read" ON orders FOR SELECT
  USING (session_id = current_setting('request.headers')::json->>'x-session-id');

-- Order items follow order access
CREATE POLICY "order_items_restaurant_access" ON order_items FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "order_items_anon_insert" ON order_items FOR INSERT
  WITH CHECK (TRUE);

-- Tables & rooms: public read, restaurant write
CREATE POLICY "tables_public_read" ON tables FOR SELECT USING (TRUE);
CREATE POLICY "tables_restaurant_write" ON tables FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "rooms_public_read" ON rooms FOR SELECT USING (TRUE);
CREATE POLICY "rooms_restaurant_write" ON rooms FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Profiles
CREATE POLICY "profiles_own_read" ON profiles FOR SELECT
  USING (id = auth.uid() OR restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Service requests
CREATE POLICY "service_requests_restaurant" ON service_requests FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_requests_anon_insert" ON service_requests FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- REALTIME: Enable for order flow
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;

-- ============================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_service_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
