import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const MAX_SUBJECT = 240;
const MAX_BODY = 12000;

function venueRestaurantId(req) {
  return req.profile?.restaurant_id || null;
}

/** Venues: list support tickets for the logged-in tenant (owner + staff). */
router.get('/tickets', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = venueRestaurantId(req);
  if (!rid) return res.status(400).json({ error: 'No restaurant context on your profile' });

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, created_at, updated_at, resolved_at')
    .eq('restaurant_id', rid)
    .order('updated_at', { ascending: false });

  if (error) {
    if (String(error.message || '').includes('support_tickets')) {
      return res.status(503).json({ error: 'Support inbox is not available yet. Ask your admin to run the latest database migration.' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

/** Create ticket + first message */
router.post('/tickets', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = venueRestaurantId(req);
  if (!rid) return res.status(400).json({ error: 'No restaurant context on your profile' });

  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!subject || subject.length > MAX_SUBJECT) {
    return res.status(400).json({ error: `subject is required (max ${MAX_SUBJECT} characters)` });
  }
  if (!message || message.length > MAX_BODY) {
    return res.status(400).json({ error: `message is required (max ${MAX_BODY} characters)` });
  }

  const now = new Date().toISOString();
  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .insert({
      restaurant_id: rid,
      subject,
      status: 'awaiting_hq',
      created_by: req.profile.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (tErr) {
    if (String(tErr.message || '').includes('support_tickets')) {
      return res.status(503).json({ error: 'Support is not available yet. Run database migration 019_platform_hq_support_broadcasts.sql.' });
    }
    return res.status(500).json({ error: tErr.message });
  }

  const { error: mErr } = await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    author_id: req.profile.id,
    is_hq_reply: false,
    body: message,
  });

  if (mErr) return res.status(500).json({ error: mErr.message });
  res.status(201).json(ticket);
});

router.get('/tickets/:ticketId', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = venueRestaurantId(req);
  if (!rid) return res.status(400).json({ error: 'No restaurant context' });

  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', req.params.ticketId)
    .eq('restaurant_id', rid)
    .maybeSingle();

  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { data: messages, error: mErr } = await supabase
    .from('support_messages')
    .select('id, author_id, is_hq_reply, body, created_at')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (mErr) return res.status(500).json({ error: mErr.message });

  const authorIds = [...new Set((messages || []).map((m) => m.author_id).filter(Boolean))];
  let names = {};
  if (authorIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, role').in('id', authorIds);
    names = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }

  const enriched = (messages || []).map((m) => ({
    ...m,
    author_name: m.author_id ? names[m.author_id]?.full_name || '—' : '—',
    author_role: m.author_id ? names[m.author_id]?.role : null,
  }));

  res.json({ ticket, messages: enriched });
});

/** Venue reply on ticket */
router.post('/tickets/:ticketId/messages', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = venueRestaurantId(req);
  if (!rid) return res.status(400).json({ error: 'No restaurant context' });

  const body = String(req.body?.body || '').trim();
  if (!body || body.length > MAX_BODY) {
    return res.status(400).json({ error: `body is required (max ${MAX_BODY} characters)` });
  }

  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('id, restaurant_id, status')
    .eq('id', req.params.ticketId)
    .maybeSingle();

  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!ticket || ticket.restaurant_id !== rid) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return res.status(400).json({ error: 'This ticket is closed. Open a new one if you need further help.' });
  }

  const now = new Date().toISOString();
  const { data: row, error: mErr } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      author_id: req.profile.id,
      is_hq_reply: false,
      body,
    })
    .select()
    .single();

  if (mErr) return res.status(500).json({ error: mErr.message });

  await supabase
    .from('support_tickets')
    .update({ updated_at: now, status: 'awaiting_hq' })
    .eq('id', ticket.id);

  res.status(201).json(row);
});

export default router;
