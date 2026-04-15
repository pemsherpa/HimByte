import { Router } from 'express';
import { supabase, getClient } from '../supabaseClient.js';
import { requireAuth, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';

const router = Router();

const SETTLE_PAYMENT_METHODS = new Set(['cash', 'digital_wallet', 'bank_transfer', 'esewa', 'manual']);

/**
 * Orders that count toward tables_rooms.running_total (pending → approved adds to the bill).
 * Pending-only orders have line items in DB but are not on the check until approved.
 */
const ON_BILL_STATUSES = ['approved', 'preparing', 'ready', 'served'];

function buildReceiptLinesFromOrders(orders) {
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

async function insertReceiptSafe(db, row) {
  const attempt = async (payload) => db.from('receipts').insert(payload).select().single();
  let { data, error } = await attempt(row);
  if (!error) return { data, error: null };

  const slim = { ...row };
  delete slim.table_room_id;
  delete slim.payment_method;
  delete slim.payment_ref;
  ({ data, error } = await attempt(slim));
  return { data, error };
}

async function markTablePaidSafe(db, tableId, restaurantId, fields) {
  let { error } = await db
    .from('tables_rooms')
    .update(fields)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId);
  if (!error) return null;

  const slim = { ...fields };
  delete slim.last_paid_at;
  delete slim.last_payment_method;
  delete slim.last_payment_ref;
  ({ error } = await db
    .from('tables_rooms')
    .update(slim)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId));
  return error || null;
}

function buildLineItemsFromOrders(orders) {
  const lines = [];
  for (const order of orders || []) {
    const rows = order.order_items || [];
    if (rows.length) {
      for (const oi of rows) {
        lines.push({
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
    } else {
      const tp = Number(order.total_price || 0);
      if (tp > 0) {
        lines.push({
          order_item_id: `order-${order.id}`,
          order_id: order.id,
          order_status: order.status,
          menu_item_id: null,
          name: 'Order total',
          image_url: null,
          quantity: 1,
          price_at_time: tp,
          line_total: tp,
        });
      }
    }
  }
  return lines;
}

/** Line sum for orders that are actually on the running bill (matches subtotal in drawer). */
async function computeLineTotal(db, tableRoomId) {
  const { data: orders } = await db
    .from('orders')
    .select('total_price, status, order_items(quantity, price_at_time)')
    .eq('table_room_id', tableRoomId)
    .in('status', ON_BILL_STATUSES);

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

// Staff: Detailed bill — "items" / subtotal = on-bill only (approved+); pending shown separately
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

  const list = orders || [];
  const onBillOrders = list.filter((o) => ON_BILL_STATUSES.includes(o.status));
  const pendingOrders = list.filter((o) => o.status === 'pending');

  const items = buildLineItemsFromOrders(onBillOrders);
  const pending_items = buildLineItemsFromOrders(pendingOrders);
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const pending_subtotal = pending_items.reduce((s, i) => s + i.line_total, 0);

  res.json({
    table,
    orders: list,
    items,
    subtotal,
    pending_items,
    pending_subtotal,
    running_total: Number(table.running_total || 0),
  });
});

// Staff: Settle / close a table — mark active orders as served, reset running_total
router.post('/:tableRoomId/settle', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const rawMethod = req.body?.payment_method != null ? String(req.body.payment_method).trim() : 'cash';
  const payment_method = SETTLE_PAYMENT_METHODS.has(rawMethod) ? rawMethod : 'cash';

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
  const ts = new Date().toISOString();

  // Snapshot receipt lines before detaching orders from this table.
  let receiptId = null;
  try {
    const { data: rest } = await db
      .from('restaurants')
      .select('vat_pan_number')
      .eq('id', table.restaurant_id)
      .maybeSingle();
    const { data: orders } = await db
      .from('orders')
      .select('id, status, session_id, order_items(quantity, price_at_time, menu_items(name))')
      .eq('restaurant_id', table.restaurant_id)
      .eq('table_room_id', table.id)
      .in('status', ON_BILL_STATUSES);
    const lines = buildReceiptLinesFromOrders(orders || []);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
    const session_id = (orders || []).find((o) => o.session_id)?.session_id || null;
    if (lines.length) {
      const { data: receipt, error: rErr } = await insertReceiptSafe(db, {
        restaurant_id: table.restaurant_id,
        session_id,
        guest_email: null,
        line_items: lines,
        subtotal,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: subtotal,
        pan_display: rest?.vat_pan_number || null,
        table_room_id: table.id,
        payment_method,
        payment_ref: null,
      });
      if (!rErr && receipt?.id) receiptId = receipt.id;
    }
  } catch {
    // ignore receipt creation errors on manual settle
  }

  // Close the check: mark unpaid orders served and detach all rows from this table so the next session is clean.
  const { error: ordErr } = await db
    .from('orders')
    .update({ status: 'served', table_room_id: null, updated_at: ts })
    .eq('table_room_id', table.id)
    .eq('restaurant_id', table.restaurant_id)
    .neq('status', 'cancelled');

  if (ordErr) return res.status(500).json({ error: ordErr.message });

  const { error: canErr } = await db
    .from('orders')
    .update({ table_room_id: null, updated_at: ts })
    .eq('table_room_id', table.id)
    .eq('restaurant_id', table.restaurant_id)
    .eq('status', 'cancelled');

  if (canErr) return res.status(500).json({ error: canErr.message });

  const { error: rtErr } = await db
    .from('tables_rooms')
    .update({ running_total: 0 })
    .eq('id', table.id)
    .eq('restaurant_id', table.restaurant_id);

  if (rtErr) return res.status(500).json({ error: rtErr.message });

  await markTablePaidSafe(db, table.id, table.restaurant_id, {
    last_paid_at: ts,
    last_payment_method: payment_method,
    last_payment_ref: null,
  });

  res.json({
    settled_total,
    table_id: table.id,
    receipt_id: receiptId,
    payment_method,
    message: 'Table settled',
  });
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

  const { data: orderRows, error: oErr } = await db
    .from('orders')
    .select('id, total_price, status, restaurant_id, table_room_id')
    .in('id', order_ids)
    .eq('table_room_id', srcTable.id)
    .eq('restaurant_id', srcTable.restaurant_id);

  if (oErr) return res.status(500).json({ error: oErr.message });

  const movable = (orderRows || []).filter((o) => o.status !== 'cancelled');
  if (!movable.length) {
    return res.status(400).json({
      error: 'No orders to transfer — select at least one order that is still on this table.',
    });
  }

  const movedTotal = movable.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const ids = movable.map((o) => o.id);

  const { error: uErr } = await db
    .from('orders')
    .update({ table_room_id: dstTable.id, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (uErr) return res.status(500).json({ error: uErr.message });

  const { error: srcRtErr } = await db
    .from('tables_rooms')
    .update({ running_total: Math.max(0, Number(srcTable.running_total || 0) - movedTotal) })
    .eq('id', srcTable.id)
    .eq('restaurant_id', srcTable.restaurant_id);

  if (srcRtErr) return res.status(500).json({ error: srcRtErr.message });

  const { error: dstRtErr } = await db
    .from('tables_rooms')
    .update({ running_total: Number(dstTable.running_total || 0) + movedTotal })
    .eq('id', dstTable.id)
    .eq('restaurant_id', dstTable.restaurant_id);

  if (dstRtErr) return res.status(500).json({ error: dstRtErr.message });

  res.json({ moved_orders: movable.length, moved_total: movedTotal });
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
      .in('status', ON_BILL_STATUSES);

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
