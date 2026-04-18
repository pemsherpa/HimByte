import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const MAX_BODY = 12000;
const MAX_TITLE = 200;

// ── Restaurant drill-down (super admin) ───────────────────────
router.get('/restaurants/:id/detail', requireAuth, requireRole('super_admin'), async (req, res) => {
  const id = req.params.id;

  const { data: restaurant, error: rErr } = await supabase.from('restaurants').select('*').eq('id', id).maybeSingle();
  if (rErr) return res.status(500).json({ error: rErr.message });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, created_at')
    .eq('restaurant_id', id);

  const owner = (profiles || []).find((p) => p.role === 'restaurant_admin') || null;
  const staffCount = (profiles || []).filter((p) => p.role === 'staff').length;

  const { count: tableCount } = await supabase
    .from('tables_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', id);

  const { data: orderRows } = await supabase
    .from('orders')
    .select('total_price, status')
    .eq('restaurant_id', id);

  const orders = orderRows || [];
  const totalOrders = orders.length;
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price || 0), 0);

  let receiptTotal = null;
  let receiptCount = null;
  try {
    const { data: receipts } = await supabase.from('receipts').select('total_amount').eq('restaurant_id', id);
    if (receipts) {
      receiptCount = receipts.length;
      receiptTotal = receipts.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    }
  } catch {
    receiptCount = null;
    receiptTotal = null;
  }

  res.json({
    restaurant,
    owner,
    profiles: profiles || [],
    staff_count: staffCount,
    table_count: tableCount || 0,
    total_orders: totalOrders,
    order_revenue: revenue,
    receipt_count: receiptCount,
    receipt_total: receiptTotal,
  });
});

// ── All orders (super admin) ────────────────────────────────────
router.get('/platform-orders', requireAuth, requireRole('super_admin'), async (req, res) => {
  const restaurantId = req.query.restaurant_id ? String(req.query.restaurant_id) : null;
  const status = req.query.status ? String(req.query.status) : null;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  let q = supabase
    .from('orders')
    .select(
      'id, restaurant_id, table_room_id, status, total_price, notes, created_at, updated_at, display_number, restaurants(name, slug), tables_rooms(identifier, type)',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (restaurantId) q = q.eq('restaurant_id', restaurantId);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Cross-tenant insights ───────────────────────────────────────
router.get('/analytics-insights', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, subscription_status, subscription_plan, created_at');
  if (rErr) return res.status(500).json({ error: rErr.message });

  const { data: orderRows, error: oErr } = await supabase
    .from('orders')
    .select('restaurant_id, total_price, status');
  if (oErr) return res.status(500).json({ error: oErr.message });

  const { data: tables } = await supabase.from('tables_rooms').select('restaurant_id');

  const { data: profs } = await supabase.from('profiles').select('restaurant_id, role').not('restaurant_id', 'is', null);

  const tableCountBy = {};
  for (const t of tables || []) {
    tableCountBy[t.restaurant_id] = (tableCountBy[t.restaurant_id] || 0) + 1;
  }

  const staffBy = {};
  for (const p of profs || []) {
    if (p.role !== 'staff') continue;
    staffBy[p.restaurant_id] = (staffBy[p.restaurant_id] || 0) + 1;
  }

  const agg = {};
  for (const o of orderRows || []) {
    const rid = o.restaurant_id;
    if (!rid) continue;
    if (!agg[rid]) agg[rid] = { orders: 0, revenue: 0, cancelled: 0 };
    agg[rid].orders += 1;
    if (o.status === 'cancelled') agg[rid].cancelled += 1;
    else agg[rid].revenue += Number(o.total_price || 0);
  }

  const rows = (restaurants || []).map((r) => ({
    restaurant_id: r.id,
    name: r.name,
    slug: r.slug,
    is_active: r.is_active,
    subscription_status: r.subscription_status,
    subscription_plan: r.subscription_plan,
    created_at: r.created_at,
    order_count: agg[r.id]?.orders || 0,
    revenue: Math.round((agg[r.id]?.revenue || 0) * 100) / 100,
    cancelled_orders: agg[r.id]?.cancelled || 0,
    table_count: tableCountBy[r.id] || 0,
    staff_count: staffBy[r.id] || 0,
  }));

  const byRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
  const byOrders = [...rows].sort((a, b) => b.order_count - a.order_count);
  const byTables = [...rows].sort((a, b) => b.table_count - a.table_count);

  const topRevenue = byRevenue.slice(0, 10);
  const lowestRevenue = [...rows].filter((x) => x.order_count > 0).sort((a, b) => a.revenue - b.revenue).slice(0, 5);
  const lowestOrders = [...rows].sort((a, b) => a.order_count - b.order_count).slice(0, 5);

  res.json({
    tenants: rows.length,
    top_by_revenue: topRevenue,
    top_by_orders: byOrders.slice(0, 10),
    top_by_tables: byTables.slice(0, 10),
    lowest_by_revenue: lowestRevenue,
    lowest_by_orders: lowestOrders,
  });
});

// ── Billing / plans snapshot (super admin) ─────────────────────
router.get('/billing-summary', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, subscription_status, subscription_plan, trial_ends_at');

  const subCounts = {};
  for (const r of restaurants || []) {
    const k = String(r.subscription_status || 'unknown');
    subCounts[k] = (subCounts[k] || 0) + 1;
  }

  let receiptSum = 0;
  let receiptN = 0;
  try {
    const { data: rec } = await supabase.from('receipts').select('total_amount');
    if (rec) {
      receiptN = rec.length;
      receiptSum = rec.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    }
  } catch { /* optional */ }

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 86400000);
  const trialsEnding = (restaurants || []).filter((r) => {
    if (!r.trial_ends_at) return false;
    const t = new Date(r.trial_ends_at);
    return t > now && t <= soon;
  }).length;

  const { data: orderRows } = await supabase.from('orders').select('total_price, status');
  const paidLike = (orderRows || []).filter((o) => o.status !== 'cancelled');
  const platformOrderRevenue = paidLike.reduce((s, o) => s + Number(o.total_price || 0), 0);

  res.json({
    restaurant_count: (restaurants || []).length,
    subscription_breakdown: subCounts,
    trials_ending_next_7_days: trialsEnding,
    receipt_line_count: receiptN,
    receipt_total_amount: Math.round(receiptSum * 100) / 100,
    platform_order_revenue_ex_cancelled: Math.round(platformOrderRevenue * 100) / 100,
    note:
      'Receipt totals reflect VAT receipts stored in Himbyte; order revenue aggregates exclude cancelled orders. Use alongside your accounting tools for statutory filings.',
  });
});

// ── Support inbox (super admin) ────────────────────────────────
router.get('/support-tickets', requireAuth, requireRole('super_admin'), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;

  let q = supabase
    .from('support_tickets')
    .select('*, restaurants(name, slug)')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) {
    if (String(error.message || '').includes('support_tickets')) {
      return res.status(503).json({ error: 'Support tables missing. Apply migration 019_platform_hq_support_broadcasts.sql.' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

router.get('/support-tickets/:ticketId', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('*, restaurants(name, slug)')
    .eq('id', req.params.ticketId)
    .maybeSingle();

  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { data: messages, error: mErr } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (mErr) return res.status(500).json({ error: mErr.message });

  const authorIds = [...new Set((messages || []).map((m) => m.author_id).filter(Boolean))];
  let names = {};
  if (authorIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, role, email').in('id', authorIds);
    names = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }

  const enriched = (messages || []).map((m) => ({
    ...m,
    author_name: m.author_id ? names[m.author_id]?.full_name || '—' : '—',
    author_email: m.author_id ? names[m.author_id]?.email : null,
    author_role: m.author_id ? names[m.author_id]?.role : null,
  }));

  res.json({ ticket, messages: enriched });
});

router.post('/support-tickets/:ticketId/messages', requireAuth, requireRole('super_admin'), async (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body || body.length > MAX_BODY) {
    return res.status(400).json({ error: `body required (max ${MAX_BODY} chars)` });
  }

  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('id, status')
    .eq('id', req.params.ticketId)
    .maybeSingle();

  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status === 'closed') {
    return res.status(400).json({ error: 'Ticket is closed' });
  }

  const now = new Date().toISOString();
  const { data: row, error: mErr } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      author_id: req.profile.id,
      is_hq_reply: true,
      body,
    })
    .select()
    .single();

  if (mErr) return res.status(500).json({ error: mErr.message });

  await supabase
    .from('support_tickets')
    .update({ updated_at: now, status: 'open' })
    .eq('id', ticket.id);

  res.status(201).json(row);
});

router.patch('/support-tickets/:ticketId', requireAuth, requireRole('super_admin'), async (req, res) => {
  const status = req.body?.status ? String(req.body.status).trim() : null;
  const valid = ['open', 'awaiting_hq', 'resolved', 'closed'];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  const now = new Date().toISOString();
  const patch = { status, updated_at: now };
  if (status === 'resolved' || status === 'closed') {
    patch.resolved_at = now;
    patch.resolved_by = req.profile.id;
  } else {
    patch.resolved_at = null;
    patch.resolved_by = null;
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update(patch)
    .eq('id', req.params.ticketId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Ticket not found' });
  res.json(data);
});

// ── HQ broadcasts ─────────────────────────────────────────────
router.get('/broadcasts', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('hq_broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    if (String(error.message || '').includes('hq_broadcasts')) {
      return res.json([]);
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

router.post('/broadcasts', requireAuth, requireRole('super_admin'), async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const body = String(req.body?.body || '').trim();
  const target_scope = String(req.body?.target_scope || 'all').toLowerCase() === 'restaurants' ? 'restaurants' : 'all';
  const restaurant_ids = Array.isArray(req.body?.restaurant_ids) ? req.body.restaurant_ids.map(String) : null;

  if (!title || title.length > MAX_TITLE) return res.status(400).json({ error: 'title required' });
  if (!body || body.length > MAX_BODY) return res.status(400).json({ error: 'body required' });
  if (target_scope === 'restaurants' && (!restaurant_ids || !restaurant_ids.length)) {
    return res.status(400).json({ error: 'restaurant_ids required when target_scope is restaurants' });
  }

  const { data, error } = await supabase
    .from('hq_broadcasts')
    .insert({
      title,
      body,
      target_scope,
      restaurant_ids: target_scope === 'restaurants' ? restaurant_ids : null,
      created_by: req.user?.id || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
