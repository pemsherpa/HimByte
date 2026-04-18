import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';
import { requireAuth, requireRole, requireRestaurant } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';

const router = Router();

const defaultAppUrl = () => process.env.APP_URL || process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5174';

/** Columns safe before/after optional migrations (avoid 500 if e.g. venue_type not migrated yet). */
/** Guest menu / public slug — no billing fields. */
const RESTAURANT_PUBLIC_FIELDS =
  'id, name, slug, logo_url, address, phone, vat_pan_number, is_active, venue_type';

/** Staff dashboard by UUID — includes subscription summary for owners. */
const RESTAURANT_BY_ID_FIELDS = `${RESTAURANT_PUBLIC_FIELDS}, subscription_status, subscription_plan, trial_ends_at`;

// Public: Get restaurant by UUID (for staff dashboard / QR page)
router.get('/by-id/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(RESTAURANT_BY_ID_FIELDS)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(data);
});

// Public: Get restaurant by slug
router.get('/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase().trim();
  if (slug === 'by-id') return res.status(404).json({ error: 'Not found' });

  const { data, error } = await supabase
    .from('restaurants')
    .select(RESTAURANT_PUBLIC_FIELDS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Restaurant not found' });

  try {
    await assertGuestRestaurantActive(data.id);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  res.json(data);
});

// Public: Get tables & rooms for a restaurant (unified)
// Note: no subscription gate here — staff dashboards need this even when billing is overdue.
router.get('/:restaurantId/tables_rooms', async (req, res) => {
  const { type } = req.query;
  let query = supabase
    .from('tables_rooms')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .order('identifier');

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Owner: Add a table or room — unique QR URL per row (stable `loc` = tables_rooms.id)
router.post(
  '/:restaurantId/tables_rooms',
  requireAuth,
  requireRestaurant,
  requireRole('restaurant_admin', 'super_admin'),
  requireActiveStaffSubscription,
  async (req, res) => {
    const { identifier, type = 'table' } = req.body;
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: 'identifier is required (e.g. Table 6)' });
    }

    const { data: venue, error: vErr } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', req.restaurantId)
      .single();

    if (vErr || !venue?.slug) return res.status(500).json({ error: vErr?.message || 'Restaurant not found' });

    const locType = type === 'room' ? 'room' : 'table';

    const { data: row, error: insErr } = await supabase
      .from('tables_rooms')
      .insert({
        restaurant_id: req.restaurantId,
        identifier: String(identifier).trim(),
        type: locType,
      })
      .select()
      .single();

    if (insErr) {
      if (insErr.code === '23505' || String(insErr.message || '').includes('unique')) {
        return res.status(409).json({ error: 'A table or room with this name already exists for this venue' });
      }
      return res.status(500).json({ error: insErr.message });
    }

    const base = defaultAppUrl().replace(/\/$/, '');
    const qr_code_url = `${base}/scan?r=${encodeURIComponent(venue.slug)}&loc=${row.id}`;

    const { data: updated, error: uErr } = await supabase
      .from('tables_rooms')
      .update({ qr_code_url })
      .eq('id', row.id)
      .eq('restaurant_id', req.restaurantId)
      .select()
      .single();

    if (uErr) return res.status(500).json({ error: uErr.message });
    res.status(201).json(updated);
  },
);

// Owner: Delete a table or room (only if nothing is currently linked)
router.delete(
  '/:restaurantId/tables_rooms/:tableRoomId',
  requireAuth,
  requireRestaurant,
  requireRole('restaurant_admin', 'super_admin'),
  requireActiveStaffSubscription,
  async (req, res) => {
    const id = req.params.tableRoomId;
    if (!id) return res.status(400).json({ error: 'tableRoomId is required' });

    const { count, error: cErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', req.restaurantId)
      .eq('table_room_id', id);

    if (cErr) return res.status(500).json({ error: cErr.message });
    if ((count || 0) > 0) {
      return res.status(409).json({
        error: 'This table/room has orders linked. Settle and clear the table bill before deleting.',
      });
    }

    const { error: dErr } = await supabase
      .from('tables_rooms')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', req.restaurantId);

    if (dErr) return res.status(500).json({ error: dErr.message });
    return res.status(204).send();
  },
);

export default router;
