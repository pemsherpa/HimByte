import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

router.get('/:restaurantId/categories', async (req, res) => {
  const { context } = req.query; // 'table' or 'room'
  let query = supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .eq('is_active', true)
    .order('sort_order');

  if (context) query = query.eq('context', context);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:restaurantId/items', async (req, res) => {
  const { category_id } = req.query;
  let query = supabase
    .from('menu_items')
    .select('*, categories(name, icon)')
    .eq('restaurant_id', req.params.restaurantId)
    .eq('is_available', true)
    .order('sort_order');

  if (category_id) query = query.eq('category_id', category_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
