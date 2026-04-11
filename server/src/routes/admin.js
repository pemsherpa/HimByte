import { Router } from 'express';
import { supabase } from '../index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Super Admin: Create a new restaurant tenant
router.post('/restaurants', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { name, slug, address, city, phone, email, pan_number, vat_registered, is_hotel, owner_email } = req.body;

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name,
      slug,
      address,
      city,
      phone,
      email,
      pan_number,
      vat_registered: vat_registered || false,
      is_hotel: is_hotel || false,
      subscription_status: 'trial',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Super Admin: List all restaurants
router.get('/restaurants', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, profiles(id, full_name, role)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Super Admin: Update subscription
router.patch('/restaurants/:id/subscription', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { subscription_status, subscription_plan } = req.body;

  const { data, error } = await supabase
    .from('restaurants')
    .update({ subscription_status, subscription_plan })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Super Admin: Global analytics
router.get('/analytics', requireAuth, requireRole('super_admin'), async (req, res) => {
  const [restaurants, orders, revenue] = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact' }),
    supabase.from('orders').select('id', { count: 'exact' }),
    supabase.from('orders').select('total').not('status', 'in', '("rejected","cancelled")'),
  ]);

  const totalRevenue = revenue.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

  res.json({
    total_restaurants: restaurants.count || 0,
    total_orders: orders.count || 0,
    total_revenue: totalRevenue,
  });
});

// Restaurant Admin: Manage menu items
router.post('/menu-items', requireAuth, requireRole('restaurant_admin', 'super_admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/menu-items/:id', requireAuth, requireRole('restaurant_admin', 'staff', 'super_admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Toggle item availability
router.patch('/menu-items/:id/toggle', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const { data: item } = await supabase
    .from('menu_items')
    .select('is_available')
    .eq('id', req.params.id)
    .single();

  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: !item.is_available })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
