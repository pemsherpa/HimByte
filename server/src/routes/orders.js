import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase, getClient } from '../supabaseClient.js';
import { requireAuth, requireRole, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';
import {
  MAX_ORDER_LINE_ITEMS,
  mergeOrderLineItems,
  sanitizeContactField,
  sanitizeNotes,
} from '../lib/orderValidation.js';
import { sendGuestEmail, guestOrderApprovedContent, guestOrderReadyContent } from '../lib/mailer.js';

const router = Router();

const guestOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many orders from this address. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest: Place an order (no auth needed) — prices computed server-side from menu_items
router.post('/', guestOrderLimiter, async (req, res) => {
  const { restaurant_id, table_room_id, items, notes, session_id, guest_phone, guest_email } = req.body;

  if (!restaurant_id) {
    return res.status(400).json({ error: 'restaurant_id is required' });
  }

  const merged = mergeOrderLineItems(items);
  if (!merged.length) {
    return res.status(400).json({ error: 'At least one valid line item (menu_item_id + quantity) is required' });
  }
  if (merged.length > MAX_ORDER_LINE_ITEMS) {
    return res.status(400).json({ error: `Maximum ${MAX_ORDER_LINE_ITEMS} distinct items per order` });
  }

  try {
    await assertGuestRestaurantActive(restaurant_id);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  const menuIds = merged.map((m) => m.menu_item_id);
  const { data: menuRows, error: menuErr } = await supabase
    .from('menu_items')
    .select('id, price, is_available')
    .eq('restaurant_id', restaurant_id)
    .in('id', menuIds);

  if (menuErr) return res.status(500).json({ error: menuErr.message });

  const byId = new Map((menuRows || []).map((r) => [r.id, r]));
  if (byId.size !== menuIds.length) {
    return res.status(400).json({ error: 'One or more menu items are invalid for this restaurant' });
  }

  const unavailable = merged.filter((m) => !byId.get(m.menu_item_id)?.is_available);
  if (unavailable.length) {
    return res.status(400).json({ error: 'One or more items are not available right now' });
  }

  if (table_room_id) {
    const { data: tr, error: trErr } = await supabase
      .from('tables_rooms')
      .select('id')
      .eq('id', table_room_id)
      .eq('restaurant_id', restaurant_id)
      .maybeSingle();
    if (trErr) return res.status(500).json({ error: trErr.message });
    if (!tr?.id) {
      return res.status(400).json({ error: 'Table or room is invalid for this restaurant' });
    }
  }

  let total_price = 0;
  const pricedLines = [];
  for (const m of merged) {
    const row = byId.get(m.menu_item_id);
    const unit = Number(row?.price);
    if (!Number.isFinite(unit) || unit < 0) {
      return res.status(500).json({ error: 'Invalid menu price in catalog' });
    }
    total_price += unit * m.quantity;
    pricedLines.push({
      menu_item_id: m.menu_item_id,
      quantity: m.quantity,
      price_at_time: unit,
    });
  }

  const safeNotes = sanitizeNotes(notes);
  const safePhone = sanitizeContactField(guest_phone);
  const safeEmail = sanitizeContactField(guest_email);

  let nextDisplay = 1;
  const { data: maxRow } = await supabase
    .from('orders')
    .select('display_number')
    .eq('restaurant_id', restaurant_id)
    .order('display_number', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (maxRow?.display_number != null && Number.isFinite(Number(maxRow.display_number))) {
    nextDisplay = Number(maxRow.display_number) + 1;
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id,
      table_room_id: table_room_id || null,
      status: 'pending',
      total_price,
      notes: safeNotes,
      session_id: session_id ? String(session_id).slice(0, 128) : null,
      guest_phone: safePhone,
      guest_email: safeEmail,
      display_number: nextDisplay,
    })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  const orderItems = pricedLines.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    price_at_time: item.price_at_time,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  res.status(201).json(order);
});

// Guest: Track orders by session ID
router.get('/track/:sessionId', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name, image_url, price)), tables_rooms(identifier, type)')
    .eq('session_id', req.params.sessionId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Get orders for a restaurant
router.get('/restaurant/:restaurantId', requireAuth, requireRestaurant, requireActiveStaffSubscription, async (req, res) => {
  const { status } = req.query;
  const db = getClient(req);

  let query = db
    .from('orders')
    .select('*, order_items(*, menu_items(name, image_url, price)), tables_rooms(identifier, type)')
    .eq('restaurant_id', req.restaurantId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Update order status (+ add to table running bill when moving pending → approved)
router.patch('/:orderId/status', requireAuth, requireRole('restaurant_admin', 'staff', 'super_admin'), requireActiveStaffSubscription, async (req, res) => {
  const { status } = req.body;
  const db = getClient(req);

  const validStatuses = ['pending', 'approved', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const { data: existing, error: fetchErr } = await db
    .from('orders')
    .select('id, status, restaurant_id, table_room_id, total_price, guest_email, display_number')
    .eq('id', req.params.orderId)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Order not found' });

  if (req.profile.role !== 'super_admin' && existing.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'You cannot update orders for another restaurant' });
  }

  const wasPending = existing.status === 'pending';
  const toApproved = status === 'approved';

  const { data, error } = await db
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.orderId)
    .eq('restaurant_id', existing.restaurant_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (toApproved && wasPending && existing.table_room_id) {
    const { data: tr, error: trErr } = await db
      .from('tables_rooms')
      .select('running_total')
      .eq('id', existing.table_room_id)
      .eq('restaurant_id', existing.restaurant_id)
      .maybeSingle();

    if (!trErr && tr) {
      const next = Number(tr.running_total || 0) + Number(existing.total_price || 0);
      await db
        .from('tables_rooms')
        .update({ running_total: next })
        .eq('id', existing.table_room_id)
        .eq('restaurant_id', existing.restaurant_id);
    }
  }

  const email = existing.guest_email ? String(existing.guest_email).trim() : '';
  if (email && (status === 'approved' || status === 'ready')) {
    const { data: restRow } = await db
      .from('restaurants')
      .select('name')
      .eq('id', existing.restaurant_id)
      .maybeSingle();
    const venueName = restRow?.name || 'Restaurant';
    const orderNum = data.display_number ?? existing.display_number ?? '—';

    if (status === 'approved' && wasPending) {
      const { subject, text, html } = guestOrderApprovedContent({
        venueName,
        orderNumber: orderNum,
        total: existing.total_price,
      });
      sendGuestEmail({ to: email, subject, text, html }).then((r) => {
        if (r?.skipped) console.warn('[email] skipped order approved', r.reason);
        else if (r && !r.ok) console.warn('[email] failed order approved', r.error || 'unknown');
      }).catch(() => {});
    }
    if (status === 'ready') {
      const { subject, text, html } = guestOrderReadyContent({
        venueName,
        orderNumber: orderNum,
        total: existing.total_price,
      });
      sendGuestEmail({ to: email, subject, text, html }).then((r) => {
        if (r?.skipped) console.warn('[email] skipped order ready', r.reason);
        else if (r && !r.ok) console.warn('[email] failed order ready', r.error || 'unknown');
      }).catch(() => {});
    }
  }

  res.json(data);
});

export default router;
