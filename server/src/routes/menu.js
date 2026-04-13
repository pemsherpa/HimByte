import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { assertGuestRestaurantActive } from '../lib/subscription.js';
import { attachCategoryNames } from '../lib/menuItemCategoryNames.js';

const router = Router();

// Public: Get categories for a restaurant
router.get('/:restaurantId/categories', async (req, res) => {
  try {
    await assertGuestRestaurantActive(req.params.restaurantId);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  const { service } = req.query; // '1'/'0' or 'true'/'false' to filter service categories

  let query = supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .order('name');

  if (service !== undefined) {
    query = query.eq('is_service_category', service === '1' || service === 'true');
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Public: Get menu items for a restaurant
router.get('/:restaurantId/items', async (req, res) => {
  try {
    await assertGuestRestaurantActive(req.params.restaurantId);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message, code: e.code });
  }

  const { category_id } = req.query;

  let query = supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .eq('is_available', true)
    .order('name');

  if (category_id) query = query.eq('category_id', category_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const enriched = await attachCategoryNames(supabase, data || []);
  res.json(enriched);
});

export default router;
