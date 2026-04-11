import { Router } from 'express';
import { supabase } from '../index.js';
import { requireAuth, requireRole, requireRestaurant } from '../middleware/auth.js';

const router = Router();

// Guest: Place an order (no auth needed, uses service role)
router.post('/', async (req, res) => {
  const { restaurant_id, table_id, room_id, order_type, items, customer_name, special_instructions, session_id } = req.body;

  if (!restaurant_id || !items?.length) {
    return res.status(400).json({ error: 'Restaurant ID and items are required' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const vatRate = 0.13;

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('vat_registered')
    .eq('id', restaurant_id)
    .single();

  const vatAmount = restaurant?.vat_registered ? subtotal * vatRate : 0;
  const total = subtotal + vatAmount;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id,
      table_id: table_id || null,
      room_id: room_id || null,
      order_type: order_type || 'dine_in',
      customer_name,
      special_instructions,
      session_id,
      subtotal,
      vat_amount: vatAmount,
      total,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  const orderItems = items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    restaurant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    special_instructions: item.special_instructions,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  res.status(201).json(order);
});

// Guest: Track order by session
router.get('/track/:sessionId', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, order_type, subtotal, vat_amount, total, created_at, updated_at, order_items(*, menu_items(name, image_url))')
    .eq('session_id', req.params.sessionId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Get restaurant orders
router.get('/restaurant/:restaurantId', requireAuth, requireRestaurant, async (req, res) => {
  const { status } = req.query;
  let query = supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name, image_url, price)), tables(table_number), rooms(room_number)')
    .eq('restaurant_id', req.restaurantId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Update order status (approve/reject/advance)
router.patch('/:orderId/status', requireAuth, async (req, res) => {
  const { status, rejected_reason } = req.body;

  const update = { status };
  if (status === 'approved') {
    update.approved_by = req.user.id;
    update.approved_at = new Date().toISOString();
  }
  if (status === 'rejected' && rejected_reason) {
    update.rejected_reason = rejected_reason;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', req.params.orderId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
