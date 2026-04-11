import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, logo_url, cover_image_url, address, city, phone, is_hotel, currency')
    .eq('slug', req.params.slug)
    .eq('subscription_status', 'active')
    .single();

  if (error) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(data);
});

router.get('/:restaurantId/tables', async (req, res) => {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .order('table_number');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:restaurantId/rooms', async (req, res) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('restaurant_id', req.params.restaurantId)
    .order('room_number');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
