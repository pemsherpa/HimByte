import { Router } from 'express';
import { supabase, getClient } from '../supabaseClient.js';
import { requireAuth, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';

const router = Router();

/** Sum of line items for all non-cancelled orders on a table (matches bill drawer subtotal). */
async function computeLineTotal(db, tableRoomId) {
  const { data: orders } = await db
    .from('orders')
    .select('total_price, order_items(quantity, price_at_time)')
    .eq('table_room_id', tableRoomId)
    .neq('status', 'cancelled');

  let sum = 0;
  for (const o of orders || []) {
    const items = o.order_items || [];
    if (items.length) {
      for (const oi of items) sum += Number(oi.price_at_time) * Number(oi.quantity || 0);
    } else {
      sum += Number(o.total_price || 0);
    }
  }
  return sum;
}

// Staff: List tables/rooms with running bills for a restaurant
router.get('/:restaurantId/bills', requireAuth, requireRestaurant, requireActiveStaffSubscription, async (req, res) => {
  const db = getClient(req);
  const { data, error } = await db
    .from('tables_rooms')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .order('identifier');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Detailed bill for a single table — all non-cancelled orders + items
router.get('/:tableRoomId/bill', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const db = getClient(req);
  const { data: table, error: tErr } = await db
    .from('tables_rooms')
    .select('*')
    .eq('id', req.params.tableRoomId)
    .single();

  if (tErr || !table) return res.status(404).json({ error: 'Table not found' });

  if (req.profile.role !== 'super_admin' && table.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data: orders, error: oErr } = await db
    .from('orders')
    .select('id, status, total_price, notes, created_at, order_items(id, quantity, price_at_time, menu_item_id, menu_items(name, image_url))')
    .eq('table_room_id', req.params.tableRoomId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });

  if (oErr) return res.status(500).json({ error: oErr.message });

  const allItems = [];
  for (const order of orders || []) {
    for (const oi of order.order_items || []) {
      allItems.push({
        order_item_id: oi.id,
        order_id: order.id,
        order_status: order.status,
        menu_item_id: oi.menu_item_id,
        name: oi.menu_items?.name || 'Item',
        image_url: oi.menu_items?.image_url,
        quantity: oi.quantity,
        price_at_time: oi.price_at_time,
        line_total: Number(oi.price_at_time) * oi.quantity,
      });
    }
  }

  const subtotal = allItems.reduce((s, i) => s + i.line_total, 0);

  res.json({
    table,
    orders: orders || [],
    items: allItems,
    subtotal,
    running_total: Number(table.running_total || 0),
  });
});

// Staff: Settle / close a table — mark active orders as served, reset running_total
router.post('/:tableRoomId/settle', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const db = getClient(req);
  const { data: table, error: tErr } = await db
    .from('tables_rooms')
    .select('id, restaurant_id, running_total')
    .eq('id', req.params.tableRoomId)
    .single();

  if (tErr || !table) return res.status(404).json({ error: 'Table not found' });
  if (req.profile.role !== 'super_admin' && table.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const settled_total = Number(table.running_total || 0);

  await db
    .from('orders')
    .update({ status: 'served', updated_at: new Date().toISOString() })
    .eq('table_room_id', table.id)
    .eq('restaurant_id', table.restaurant_id)
    .in('status', ['pending', 'approved', 'preparing', 'ready']);

  await db
    .from('tables_rooms')
    .update({ running_total: 0 })
    .eq('id', table.id)
    .eq('restaurant_id', table.restaurant_id);

  res.json({ settled_total, table_id: table.id, message: 'Table settled' });
});

// Staff: Transfer order items to another table
router.post('/:tableRoomId/transfer', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const { target_table_id, order_ids } = req.body;
  if (!target_table_id || !order_ids?.length) {
    return res.status(400).json({ error: 'target_table_id and order_ids are required' });
  }

  const db = getClient(req);

  const { data: srcTable } = await db.from('tables_rooms').select('id, restaurant_id, running_total').eq('id', req.params.tableRoomId).single();
  const { data: dstTable } = await db.from('tables_rooms').select('id, restaurant_id, running_total').eq('id', target_table_id).single();

  if (!srcTable || !dstTable) return res.status(404).json({ error: 'Table not found' });
  if (srcTable.restaurant_id !== dstTable.restaurant_id) return res.status(400).json({ error: 'Tables must be in the same restaurant' });
  if (req.profile.role !== 'super_admin' && srcTable.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data: orders } = await db
    .from('orders')
    .select('id, total_price')
    .in('id', order_ids)
    .eq('table_room_id', srcTable.id);

  if (!orders?.length) return res.status(404).json({ error: 'No matching orders found' });

  const movedTotal = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  await db
    .from('orders')
    .update({ table_room_id: dstTable.id, updated_at: new Date().toISOString() })
    .in('id', orders.map((o) => o.id));

  await db.from('tables_rooms').update({ running_total: Math.max(0, Number(srcTable.running_total || 0) - movedTotal) }).eq('id', srcTable.id);
  await db.from('tables_rooms').update({ running_total: Number(dstTable.running_total || 0) + movedTotal }).eq('id', dstTable.id);

  res.json({ moved_orders: orders.length, moved_total: movedTotal });
});

// Staff: Split bill calculation (equal split or by item)
router.post('/:tableRoomId/split', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const { mode = 'equal', num_ways = 2, item_groups } = req.body;
  const db = getClient(req);

  const { data: table } = await db.from('tables_rooms').select('id, restaurant_id, running_total').eq('id', req.params.tableRoomId).single();
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (req.profile.role !== 'super_admin' && table.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const lineTotal = await computeLineTotal(db, table.id);
  const total = Math.max(Number(table.running_total || 0), lineTotal);

  if (mode === 'equal') {
    const n = Math.max(1, Math.floor(num_ways));
    const perPerson = Math.ceil(total / n);
    return res.json({
      mode: 'equal',
      total,
      num_ways: n,
      per_person: perPerson,
      splits: Array.from({ length: n }, (_, i) => ({
        label: `Person ${i + 1}`,
        amount: i < n - 1 ? perPerson : total - perPerson * (n - 1),
      })),
    });
  }

  if (mode === 'by_item' && Array.isArray(item_groups)) {
    const { data: orders } = await db
      .from('orders')
      .select('id, order_items(id, quantity, price_at_time)')
      .eq('table_room_id', table.id)
      .neq('status', 'cancelled');

    const allOi = (orders || []).flatMap((o) => o.order_items || []);
    const oiMap = Object.fromEntries(allOi.map((oi) => [oi.id, oi]));

    const splits = item_groups.map((group, i) => {
      const amount = (group.order_item_ids || []).reduce((s, id) => {
        const oi = oiMap[id];
        return s + (oi ? Number(oi.price_at_time) * oi.quantity : 0);
      }, 0);
      return { label: group.label || `Group ${i + 1}`, amount, order_item_ids: group.order_item_ids };
    });

    return res.json({ mode: 'by_item', total, splits });
  }

  res.status(400).json({ error: 'Invalid split mode. Use "equal" or "by_item".' });
});

// Staff: Upload image for menu item (proxy to Supabase Storage)
router.post('/upload-menu-image', requireAuth, async (req, res) => {
  res.status(501).json({ error: 'Use client-side Supabase Storage upload' });
});

export default router;
