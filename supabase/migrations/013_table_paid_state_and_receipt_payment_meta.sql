-- Track last payment state per table/room and enrich receipts with payment metadata.
-- Multi-tenant safety: all rows are still scoped by restaurant_id in app queries + RLS policies.

-- tables_rooms: paid snapshot (used for "Bill paid" UI)
ALTER TABLE public.tables_rooms
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_tables_rooms_restaurant_paid_at
  ON public.tables_rooms (restaurant_id, last_paid_at DESC);

-- receipts: optional linkage to location + payment metadata
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS table_room_id UUID REFERENCES public.tables_rooms(id),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_receipts_restaurant_payment_created
  ON public.receipts (restaurant_id, created_at DESC);

