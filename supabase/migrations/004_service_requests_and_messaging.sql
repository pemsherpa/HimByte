-- 004: Add notes + session_id to service_requests, RLS policies
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → paste → Run

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Guest insert policy (anonymous ordering from QR)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_requests' AND policyname = 'service_requests_anon_insert') THEN
    CREATE POLICY service_requests_anon_insert ON service_requests FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Public read (staff + guests can see)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_requests' AND policyname = 'service_requests_public_read') THEN
    CREATE POLICY service_requests_public_read ON service_requests FOR SELECT USING (true);
  END IF;
END $$;

-- Staff can update service request status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_requests' AND policyname = 'service_requests_staff_update') THEN
    CREATE POLICY service_requests_staff_update ON service_requests FOR UPDATE USING (
      restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    );
  END IF;
END $$;

-- Realtime: full row replication for session_id filtering
ALTER TABLE service_requests REPLICA IDENTITY FULL;
