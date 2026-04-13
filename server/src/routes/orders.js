import { Router } from 'express';
import { supabase, getClient } from '../supabaseClient.js';
import { requireAuth, requireRole, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';

const router = Router();

// Guest: Place an order (no auth needed)
router.post('/', async (req, res) => {
  const { restaurant_id, table_room_id, items, notes, session_id, guest_phone, guest_email } = req.body;

  if (!restaurant_id || !items?.length) {
    return res.status(400).json({ error: 'restaurant_id and items are required' });
  }

  try {
    await assertGuestRestaurantActive(restaurant_id);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  const total_price = items.reduce((sum, item) => sum + Number(item.price_at_time) * item.quantity, 0);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id,
      table_room_id: table_room_id || null,
      status: 'pending',
      total_price,
      notes: notes || null,
      session_id: session_id || null,
      guest_phone: guest_phone || null,
      guest_email: guest_email || null,
    })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  const orderItems = items.map((item) => ({
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
    .select('id, status, restaurant_id, table_room_id, total_price')
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

  res.json(data);
});

export default router;
