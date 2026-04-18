-- Pending venue signups (approved rows provision auth + restaurant via API)
CREATE TABLE IF NOT EXISTS venue_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  venue_type TEXT NOT NULL DEFAULT 'restaurant' CHECK (venue_type IN ('restaurant', 'hotel')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_reg_pending_email
  ON venue_registration_requests (lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_venue_reg_status_created ON venue_registration_requests (status, created_at DESC);

ALTER TABLE venue_registration_requests ENABLE ROW LEVEL SECURITY;

-- Human-friendly order number per venue (incrementing per restaurant)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_display ON orders (restaurant_id, display_number);
