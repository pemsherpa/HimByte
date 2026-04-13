import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';

const router = Router();

const VAT_RATE = 0.13;

function buildLinesFromOrders(orders) {
  const lines = [];
  for (const o of orders || []) {
    for (const oi of o.order_items || []) {
      const name = oi.menu_items?.name || 'Item';
      const qty = Number(oi.quantity || 0);
      const unit = Number(oi.price_at_time || 0);
      const lineTotal = Math.round(unit * qty * 100) / 100;
      lines.push({ name, quantity: qty, unit_price: unit, line_total: lineTotal, order_id: o.id });
    }
  }
  return lines;
}

/** Guest: create a receipt snapshot for this session (VAT 13% Nepal, exclusive) */
router.post('/from-session', async (req, res) => {
  const { session_id, restaurant_id, guest_email } = req.body;
  if (!session_id || !restaurant_id) {
    return res.status(400).json({ error: 'session_id and restaurant_id are required' });
  }

  try {
    await assertGuestRestaurantActive(restaurant_id);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  const { data: rest } = await supabase
    .from('restaurants')
    .select('id, name, address, phone, vat_pan_number')
    .eq('id', restaurant_id)
    .single();

  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, status, order_items(quantity, price_at_time, menu_items(name))')
    .eq('session_id', session_id)
    .eq('restaurant_id', restaurant_id)
    .in('status', ['approved', 'preparing', 'ready', 'served']);

  if (oErr) return res.status(500).json({ error: oErr.message });

  const lines = buildLinesFromOrders(orders || []);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  if (lines.length === 0) {
    return res.status(400).json({ error: 'No billable items for this session yet.' });
  }

  const { data: receipt, error: rErr } = await supabase
    .from('receipts')
    .insert({
      restaurant_id,
      session_id,
      guest_email: guest_email || null,
      line_items: lines,
      subtotal,
      vat_rate: VAT_RATE,
      vat_amount: vatAmount,
      total_amount: total,
      pan_display: rest?.vat_pan_number || null,
    })
    .select()
    .single();

  if (rErr) {
    if (rErr.message?.includes('does not exist') || rErr.code === '42P01') {
      return res.status(503).json({ error: 'Receipts table not installed. Run migration 006_receipts_subscription_compat.sql.' });
    }
    return res.status(500).json({ error: rErr.message });
  }

  res.status(201).json({
    receipt,
    restaurant: rest,
    breakdown: { subtotal, vat_rate: VAT_RATE, vat_amount: vatAmount, total_amount: total },
  });
});

/** Staff: CSV export (must be registered before the generic GET below) */
router.get('/restaurant/:restaurantId/export.csv', requireAuth, requireRestaurant, requireActiveStaffSubscription, async (req, res) => {
  const rid = req.restaurantId;

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) return res.status(500).json({ error: error.message });

  const rows = [
    ['id', 'created_at', 'session_id', 'guest_email', 'subtotal', 'vat_rate', 'vat_amount', 'total_amount', 'pan_display'].join(','),
  ];
  for (const r of data || []) {
    rows.push(
      [
        r.id,
        r.created_at,
        r.session_id || '',
        (r.guest_email || '').replace(/,/g, ' '),
        r.subtotal,
        r.vat_rate,
        r.vat_amount,
        r.total_amount,
        (r.pan_display || '').replace(/,/g, ' '),
      ].join(','),
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="himbyte-receipts-${rid.slice(0, 8)}.csv"`);
  res.send(rows.join('\n'));
});

/** Staff: list receipts for tax / history */
router.get('/restaurant/:restaurantId', requireAuth, requireRestaurant, requireActiveStaffSubscription, async (req, res) => {
  const rid = req.restaurantId;

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
