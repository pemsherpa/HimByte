import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * List HQ notifications for this venue + optional newest popup to show.
 * Owner and staff both receive operational broadcasts.
 */
router.get('/', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = req.profile?.restaurant_id;
  if (!rid) return res.status(400).json({ error: 'No restaurant context' });

  const [{ data: allScope, error: e1 }, { data: picked, error: e2 }] = await Promise.all([
    supabase
      .from('hq_broadcasts')
      .select('id, title, body, target_scope, restaurant_ids, created_at, created_by')
      .eq('target_scope', 'all')
      .order('created_at', { ascending: false }),
    supabase
      .from('hq_broadcasts')
      .select('id, title, body, target_scope, restaurant_ids, created_at, created_by')
      .eq('target_scope', 'restaurants')
      .contains('restaurant_ids', [rid])
      .order('created_at', { ascending: false }),
  ]);

  const bErr = e1 || e2;
  if (bErr) {
    if (String(bErr.message || '').includes('hq_broadcasts')) {
      return res.json({ items: [], popup: null });
    }
    return res.status(500).json({ error: bErr.message });
  }

  const merged = [...(allScope || []), ...(picked || [])];
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const seen = new Set();
  const broadcasts = merged.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  const ids = broadcasts.map((b) => b.id);
  let receiptMap = {};
  if (ids.length) {
    const { data: rec } = await supabase
      .from('hq_broadcast_receipts')
      .select('broadcast_id, dismissed_popup_at, read_at')
      .eq('profile_id', req.profile.id)
      .in('broadcast_id', ids);
    receiptMap = Object.fromEntries((rec || []).map((r) => [r.broadcast_id, r]));
  }

  const items = (broadcasts || []).map((b) => {
    const r = receiptMap[b.id];
    return {
      ...b,
      read_at: r?.read_at || null,
      dismissed_popup_at: r?.dismissed_popup_at || null,
    };
  });

  let popup = null;
  for (const b of items) {
    if (!b.dismissed_popup_at) {
      popup = { id: b.id, title: b.title, body: b.body, created_at: b.created_at };
      break;
    }
  }

  res.json({ items, popup });
});

router.post('/:broadcastId/dismiss-popup', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = req.profile?.restaurant_id;
  if (!rid) return res.status(400).json({ error: 'No restaurant context' });

  const bid = req.params.broadcastId;
  const { data: b } = await supabase.from('hq_broadcasts').select('id').eq('id', bid).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Notification not found' });

  const { data: existing } = await supabase
    .from('hq_broadcast_receipts')
    .select('*')
    .eq('broadcast_id', bid)
    .eq('profile_id', req.profile.id)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from('hq_broadcast_receipts')
      .update({ dismissed_popup_at: now })
      .eq('broadcast_id', bid)
      .eq('profile_id', req.profile.id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase.from('hq_broadcast_receipts').insert({
      broadcast_id: bid,
      profile_id: req.profile.id,
      dismissed_popup_at: now,
    });
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
});

router.post('/:broadcastId/read', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const rid = req.profile?.restaurant_id;
  if (!rid) return res.status(400).json({ error: 'No restaurant context' });

  const bid = req.params.broadcastId;
  const { data: b } = await supabase.from('hq_broadcasts').select('id').eq('id', bid).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Notification not found' });

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('hq_broadcast_receipts')
    .select('*')
    .eq('broadcast_id', bid)
    .eq('profile_id', req.profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('hq_broadcast_receipts')
      .update({ read_at: now, dismissed_popup_at: existing.dismissed_popup_at || now })
      .eq('broadcast_id', bid)
      .eq('profile_id', req.profile.id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase.from('hq_broadcast_receipts').insert({
      broadcast_id: bid,
      profile_id: req.profile.id,
      read_at: now,
      dismissed_popup_at: now,
    });
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
});

export default router;
