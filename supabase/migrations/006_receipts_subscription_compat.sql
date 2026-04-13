-- Receipts ledger + ensure subscription columns exist on restaurants

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id TEXT,
  guest_email TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(8,6) NOT NULL DEFAULT 0.13,
  vat_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  pan_display TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_restaurant_created ON receipts (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_session ON receipts (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts_staff_read" ON receipts;
CREATE POLICY "receipts_staff_read" ON receipts FOR SELECT USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "receipts_service_insert" ON receipts;
CREATE POLICY "receipts_service_insert" ON receipts FOR INSERT WITH CHECK (true);

-- Subscription columns (no-op if already present from 001)
DO $$ BEGIN
  ALTER TABLE restaurants ADD COLUMN subscription_status TEXT DEFAULT 'trial';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE restaurants ADD COLUMN subscription_plan TEXT DEFAULT 'starter';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE restaurants ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
