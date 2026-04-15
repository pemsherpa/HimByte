import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRole, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';

const router = Router();

const guestServiceRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests from this address. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest: Create a service request (no auth needed, like orders)
router.post('/', guestServiceRequestLimiter, async (req, res) => {
  const { restaurant_id, table_room_id, service_type, notes, session_id } = req.body;

  if (!restaurant_id || !service_type) {
    return res.status(400).json({ error: 'restaurant_id and service_type are required' });
  }

  try {
    await assertGuestRestaurantActive(restaurant_id);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  /** All in-venue guest taps surface as high priority on Order Gate. */
  const urgency = 'high';

  const row = {
    restaurant_id,
    table_room_id: table_room_id || null,
    service_type,
    status: 'requested',
    urgency,
  };
  if (notes) row.notes = notes;
  if (session_id) row.session_id = session_id;

  let { data, error } = await supabase.from('service_requests').insert(row).select().single();

  if (error && (error.message?.includes('urgency') || error.code === '42703')) {
    delete row.urgency;
    ({ data, error } = await supabase.from('service_requests').insert(row).select().single());
  }

  if (error && error.message?.includes('notes')) {
    delete row.notes;
    ({ data, error } = await supabase.from('service_requests').insert(row).select().single());
  }

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Staff: Get service requests for a restaurant
router.get('/restaurant/:restaurantId', requireAuth, requireRestaurant, requireActiveStaffSubscription, async (req, res) => {
  const { status } = req.query;

  let query = supabase
    .from('service_requests')
    .select('*, tables_rooms(identifier, type)')
    .eq('restaurant_id', req.restaurantId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff: Update service request status (tenant-scoped — cannot update another restaurant's row)
router.patch('/:id/status', requireAuth, requireRole('restaurant_admin', 'staff', 'super_admin'), requireActiveStaffSubscription, async (req, res) => {
  const { status } = req.body;
  const valid = ['requested', 'in_progress', 'completed', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('service_requests')
    .select('id, restaurant_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!existing) return res.status(404).json({ error: 'Service request not found' });

  if (req.profile.role !== 'super_admin' && existing.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data, error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', req.params.id)
    .eq('restaurant_id', existing.restaurant_id)
    .select('*, tables_rooms(identifier, type)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
