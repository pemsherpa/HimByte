-- Himbyte HQ: venue support tickets, threaded messages, and broadcast notifications to venues.
-- All tenant-scoped tables include restaurant_id where applicable (support is keyed by restaurant_id on ticket).

CREATE TYPE support_ticket_status AS ENUM ('open', 'awaiting_hq', 'resolved', 'closed');

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status support_ticket_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_tickets_restaurant ON support_tickets(restaurant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_updated ON support_tickets(updated_at DESC);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_hq_reply BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id, created_at);

-- Broadcasts from Himbyte HQ to all venues or a subset (restaurant_ids).
CREATE TABLE hq_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_scope TEXT NOT NULL CHECK (target_scope IN ('all', 'restaurants')),
  restaurant_ids UUID[] DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hq_broadcasts_created ON hq_broadcasts(created_at DESC);

-- Per-profile tracking: popup dismissed vs opened in inbox.
CREATE TABLE hq_broadcast_receipts (
  broadcast_id UUID NOT NULL REFERENCES hq_broadcasts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dismissed_popup_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (broadcast_id, profile_id)
);

CREATE INDEX idx_hq_broadcast_receipts_profile ON hq_broadcast_receipts(profile_id);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_broadcast_receipts ENABLE ROW LEVEL SECURITY;

-- Tickets: tenant staff / owner + super_admin
CREATE POLICY support_tickets_tenant_select ON support_tickets FOR SELECT USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY support_tickets_tenant_insert ON support_tickets FOR INSERT WITH CHECK (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY support_tickets_tenant_update ON support_tickets FOR UPDATE USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Messages: visible if parent ticket is visible
CREATE POLICY support_messages_ticket_select ON support_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND (
      t.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  )
);

CREATE POLICY support_messages_ticket_insert ON support_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND (
      t.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  )
);

-- Broadcasts: readable by venue users + super_admin (writes via service API only — no insert policy for venue)
CREATE POLICY hq_broadcasts_read ON hq_broadcasts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  OR target_scope = 'all'
  OR (
    target_scope = 'restaurants'
    AND restaurant_ids IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
      AND pr.restaurant_id IS NOT NULL
      AND pr.restaurant_id = ANY (hq_broadcasts.restaurant_ids)
    )
  )
);

CREATE POLICY hq_broadcast_receipts_own ON hq_broadcast_receipts FOR ALL USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
