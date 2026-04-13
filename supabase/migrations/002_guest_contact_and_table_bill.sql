-- Guest contact on orders (lightweight customer identity; no auth.users row)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Running bill per table/room (incremented when staff approves an order)
ALTER TABLE public.tables_rooms
  ADD COLUMN IF NOT EXISTS running_total NUMERIC(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.guest_phone IS 'Guest mobile collected at QR menu check-in';
COMMENT ON COLUMN public.orders.guest_email IS 'Guest email collected at QR menu check-in';
COMMENT ON COLUMN public.tables_rooms.running_total IS 'Approved orders total for this location (NPR)';
