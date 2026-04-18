import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { supabase, getClient } from '../supabaseClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { attachCategoryNames } from '../lib/menuItemCategoryNames.js';
import { provisionRestaurantOwner } from '../lib/onboardingProvision.js';
import { decryptRegistrationSecret } from '../lib/registrationEncryption.js';
import { sendGuestEmail, venueRegistrationRejectedContent } from '../lib/mailer.js';

const router = Router();

const MENU_IMAGES_BUCKET = 'menu-images';
const MAX_MENU_IMAGE_BYTES = 10 * 1024 * 1024;

function extFromMime(contentType, filename) {
  const m = (contentType || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  const n = (filename || '').toLowerCase();
  if (n.endsWith('.png')) return 'png';
  if (n.endsWith('.webp')) return 'webp';
  if (n.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function canAccessRestaurant(req, restaurantId) {
  if (!restaurantId) return false;
  if (req.profile?.role === 'super_admin') return true;
  return req.profile?.restaurant_id === restaurantId;
}

// Super Admin: List all restaurants (with today's order counts)
router.get('/restaurants', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*, profiles(id, full_name, role, email)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const enriched = await Promise.all(
    (restaurants || []).map(async (r) => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', r.id)
        .gte('created_at', startUtc);
      return { ...r, order_count_today: count || 0 };
    })
  );

  res.json(enriched);
});

// Super Admin: Update subscription / billing fields for a tenant
router.patch('/restaurants/:id/subscription', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { subscription_status, subscription_plan, trial_ends_at } = req.body;
  const patch = {};
  if (subscription_status !== undefined) patch.subscription_status = String(subscription_status).trim();
  if (subscription_plan !== undefined) patch.subscription_plan = String(subscription_plan).trim();
  if (trial_ends_at !== undefined) {
    patch.trial_ends_at = trial_ends_at === null || trial_ends_at === '' ? null : trial_ends_at;
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'No subscription fields to update' });
  }

  const { data, error } = await supabase
    .from('restaurants')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Super Admin: Create a new restaurant tenant
router.post('/restaurants', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { name, slug, address, phone, vat_pan_number, venue_type } = req.body;
  const vt = String(venue_type || 'restaurant').toLowerCase() === 'hotel' ? 'hotel' : 'restaurant';

  const { data, error } = await supabase
    .from('restaurants')
    .insert({ name, slug, address, phone, vat_pan_number, is_active: true, venue_type: vt })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Super Admin: Delete a restaurant tenant (keeps auth.users but detaches profiles)
router.delete('/restaurants/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Restaurant id is required' });

  // Detach staff profiles so FK does not block delete (auth users remain).
  const { error: pErr } = await supabase
    .from('profiles')
    .update({ restaurant_id: null })
    .eq('restaurant_id', id);
  if (pErr) return res.status(500).json({ error: pErr.message });

  const { error: dErr } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', id);

  if (dErr) return res.status(500).json({ error: dErr.message });
  return res.status(204).send();
});

// Super Admin: Global analytics
router.get('/analytics', requireAuth, requireRole('super_admin'), async (req, res) => {
  const [restaurantsRes, ordersRes] = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id, status, total_price, created_at, order_items(quantity, menu_items(name))').order('created_at', { ascending: false }).limit(2000),
  ]);

  const orders = ordersRes.data || [];
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= startUtc);
  const nonCancelled = (list) => list.filter((o) => o.status !== 'cancelled');
  const served = orders.filter((o) => o.status === 'served');

  const totalRevenue = nonCancelled(orders).reduce((s, o) => s + Number(o.total_price || 0), 0);
  const revenueToday = nonCancelled(todayOrders).reduce((s, o) => s + Number(o.total_price || 0), 0);

  const counts = {};
  for (const o of orders) {
    for (const oi of o.order_items || []) {
      const n = oi.menu_items?.name || 'Item';
      counts[n] = (counts[n] || 0) + Number(oi.quantity || 0);
    }
  }
  const popular_items = Object.entries(counts)
    .map(([name, n]) => ({ name, orders: n }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  const hourly_orders = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}`,
    count: todayOrders.filter((o) => new Date(o.created_at).getHours() === h).length,
  }));

  let receipts_today_count = 0;
  let receipts_today_total = 0;
  let receipts_all_count = 0;
  let receipts_all_total = 0;
  try {
    const { data: rAll } = await supabase.from('receipts').select('total_amount');
    if (rAll) {
      receipts_all_count = rAll.length;
      receipts_all_total = rAll.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    }
    const { data: rToday } = await supabase
      .from('receipts')
      .select('total_amount')
      .gte('created_at', startUtc.toISOString());
    if (rToday) {
      receipts_today_count = rToday.length;
      receipts_today_total = rToday.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    }
  } catch { /* optional table */ }

  res.json({
    total_restaurants: restaurantsRes.count || 0,
    total_orders: orders.length,
    orders_today: todayOrders.length,
    total_revenue: totalRevenue,
    revenue_today: revenueToday,
    avg_order_value: orders.length ? (totalRevenue / orders.length).toFixed(2) : '0',
    completion_rate: orders.length ? ((served.length / orders.length) * 100).toFixed(1) : '0',
    popular_items: popular_items.length ? popular_items : [{ name: '—', orders: 0 }],
    hourly_orders,
    receipts_all_count,
    receipts_all_total,
    receipts_today_count,
    receipts_today_total,
  });
});

// Owner: Create a menu category (food or service)
router.post('/categories', requireAuth, requireRole('restaurant_admin', 'super_admin'), async (req, res) => {
  const { restaurant_id, name, description, priority, is_service_category } = req.body;
  if (!restaurant_id || !String(name || '').trim()) {
    return res.status(400).json({ error: 'restaurant_id and name are required' });
  }
  if (req.profile.role !== 'super_admin' && req.profile.restaurant_id !== restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const pri = priority != null ? Number(priority) : 0;
  const { data, error } = await supabase
    .from('categories')
    .insert({
      restaurant_id,
      name: String(name).trim(),
      description: description != null ? String(description) : null,
      priority: pri,
      is_service_category: !!is_service_category,
      sort_order: pri,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Staff/Admin: Get all menu items for a restaurant (includes unavailable)
router.get('/menu-items/:restaurantId', requireAuth, async (req, res) => {
  const rid = req.params.restaurantId;
  if (!canAccessRestaurant(req, rid)) {
    return res.status(403).json({ error: 'Access denied to this restaurant' });
  }
  const db = getClient(req);
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', rid)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  const enriched = await attachCategoryNames(db, data || []);
  res.json(enriched);
});

// Owner: Upload menu image (service role — avoids Storage RLS / client schema issues)
router.post('/menu-images/upload', requireAuth, requireRole('restaurant_admin', 'super_admin'), async (req, res) => {
  const { restaurant_id, content_base64, content_type, filename } = req.body;
  if (!restaurant_id || content_base64 == null || content_base64 === '') {
    return res.status(400).json({ error: 'restaurant_id and content_base64 are required' });
  }
  if (!canAccessRestaurant(req, restaurant_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const raw = String(content_base64).replace(/^data:[^;]+;base64,/, '');
  let buf;
  try {
    buf = Buffer.from(raw, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 payload' });
  }
  if (!buf.length) return res.status(400).json({ error: 'Empty image data' });
  if (buf.length > MAX_MENU_IMAGE_BYTES) {
    return res.status(400).json({ error: 'Image too large (max 10MB)' });
  }

  const ext = extFromMime(content_type, filename);
  let mime = content_type && /^image\//i.test(String(content_type))
    ? String(content_type).split(';')[0].trim()
    : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const path = `${restaurant_id}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
  res.json({ publicUrl: data.publicUrl });
});

// Owner: Create menu item
router.post('/menu-items', requireAuth, requireRole('restaurant_admin', 'super_admin'), async (req, res) => {
  const { restaurant_id, category_id, name, description, price, is_available, image_url } = req.body;
  if (!restaurant_id || !category_id || !name || price === undefined || price === null) {
    return res.status(400).json({ error: 'restaurant_id, category_id, name, and price are required' });
  }
  if (req.profile.role !== 'super_admin' && req.profile.restaurant_id !== restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id,
      category_id,
      name: String(name).trim(),
      description: description != null ? String(description) : null,
      price: Number(price),
      is_available: is_available !== false,
      image_url: image_url != null && String(image_url).trim() ? String(image_url).trim() : null,
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  const enriched = await attachCategoryNames(supabase, data);
  res.status(201).json(enriched);
});

// Owner: Delete menu item
router.delete('/menu-items/:id', requireAuth, requireRole('restaurant_admin', 'super_admin'), async (req, res) => {
  const { data: row, error: fErr } = await supabase
    .from('menu_items')
    .select('id, restaurant_id')
    .eq('id', req.params.id)
    .single();
  if (fErr || !row) return res.status(404).json({ error: 'Item not found' });
  if (req.profile.role !== 'super_admin' && row.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error } = await supabase.from('menu_items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// Staff/Admin: Toggle menu item availability
router.patch('/menu-items/:id/toggle', requireAuth, requireRole('restaurant_admin', 'staff'), async (req, res) => {
  const db = getClient(req);
  const { data: item, error: fetchError } = await db
    .from('menu_items')
    .select('is_available, restaurant_id')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !item) return res.status(404).json({ error: 'Item not found' });
  if (req.profile.role !== 'super_admin' && item.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { data, error } = await db
    .from('menu_items')
    .update({ is_available: !item.is_available })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Staff/Admin: Update menu item (partial fields)
router.patch('/menu-items/:id', requireAuth, requireRole('restaurant_admin', 'staff', 'super_admin'), async (req, res) => {
  const { data: row, error: fErr } = await supabase
    .from('menu_items')
    .select('id, restaurant_id')
    .eq('id', req.params.id)
    .single();
  if (fErr || !row) return res.status(404).json({ error: 'Item not found' });
  if (req.profile.role !== 'super_admin' && row.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const allowed = ['name', 'description', 'price', 'is_available', 'category_id', 'image_url'];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k];
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update(patch)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  const enriched = await attachCategoryNames(supabase, data);
  res.json(enriched);
});

// Restaurant analytics (merchant dashboard + Analytics page)
router.get('/restaurant-analytics/:restaurantId', requireAuth, async (req, res) => {
  const rid = req.params.restaurantId;
  if (!canAccessRestaurant(req, rid)) {
    return res.status(403).json({ error: 'Access denied to this restaurant' });
  }

  const period = String(req.query.period || 'lifetime').toLowerCase();
  const now = new Date();
  let periodStart = null;
  if (period === 'today') {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (period === 'week') {
    periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - 7);
  } else if (period === 'month') {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (period === 'year') {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }

  let query = supabase
    .from('orders')
    .select(`
      id,
      status,
      created_at,
      total_price,
      order_items (quantity, menu_items (name))
    `)
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (periodStart) {
    query = query.gte('created_at', periodStart.toISOString());
  }

  const { data: orderRows, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const orders = orderRows || [];
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const { data: todayRows } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      created_at,
      total_price,
      order_items (quantity, menu_items (name))
    `)
    .eq('restaurant_id', rid)
    .gte('created_at', startUtc.toISOString());

  const todayOrders = todayRows || [];

  const nonCancelled = (list) => list.filter((o) => o.status !== 'cancelled');
  const revenuePeriod = nonCancelled(orders).reduce((s, o) => s + Number(o.total_price || 0), 0);
  const revenueToday = nonCancelled(todayOrders).reduce((s, o) => s + Number(o.total_price || 0), 0);
  const countPeriod = orders.length;
  const countToday = todayOrders.length;
  const completedOrders = nonCancelled(orders).filter((o) => o.status === 'served').length;

  const counts = {};
  for (const o of orders) {
    for (const oi of o.order_items || []) {
      const n = oi.menu_items?.name || 'Item';
      counts[n] = (counts[n] || 0) + Number(oi.quantity || 0);
    }
  }
  let popular_items = Object.entries(counts)
    .map(([name, n]) => ({ name, orders: n }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);
  if (!popular_items.length) {
    popular_items = [{ name: '—', orders: 0 }];
  }

  const hourly_orders = Array.from({ length: 24 }, (_, h) => {
    const c = todayOrders.filter((o) => new Date(o.created_at).getHours() === h).length;
    return { hour: `${h}`, count: c };
  });

  const byDay = {};
  for (const o of orders) {
    const key = (o.created_at || '').slice(0, 10);
    if (!key) continue;
    if (!byDay[key]) byDay[key] = { revenue: 0, orders: 0 };
    byDay[key].orders += 1;
    if (o.status !== 'cancelled') byDay[key].revenue += Number(o.total_price || 0);
  }

  let chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13));
  if (periodStart && periodStart > chartStart) chartStart = periodStart;
  if (period === 'today') {
    chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const endDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxChartStart = new Date(endDay.getTime() - 30 * 86400000);
  if (chartStart < maxChartStart) chartStart = maxChartStart;

  const revenue_by_day = [];
  for (let t = chartStart.getTime(); t <= endDay.getTime(); t += 86400000) {
    const d = new Date(t);
    const key = d.toISOString().slice(0, 10);
    const row = byDay[key] || { revenue: 0, orders: 0 };
    revenue_by_day.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      revenue: row.revenue,
      orders: row.orders,
    });
  }

  const orders_by_status = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const status_order = ['pending', 'approved', 'preparing', 'ready', 'served', 'cancelled'];
  const orders_by_status_rows = status_order.map((status) => ({
    status,
    count: orders_by_status[status] || 0,
  }));

  /** VAT receipts (stored snapshots) — same period as KPIs; pairs with Receipts & VAT page. */
  let receipts_count = 0;
  let receipts_total = 0;
  let receipts_today_count = 0;
  let receipts_today_total = 0;
  try {
    let rQ = supabase.from('receipts').select('total_amount, created_at').eq('restaurant_id', rid);
    if (periodStart) rQ = rQ.gte('created_at', periodStart.toISOString());
    const { data: recPeriod, error: e1 } = await rQ;
    if (!e1 && recPeriod) {
      receipts_count = recPeriod.length;
      receipts_total = recPeriod.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    }
    const { data: recTodayRows, error: e2 } = await supabase
      .from('receipts')
      .select('total_amount')
      .eq('restaurant_id', rid)
      .gte('created_at', startUtc.toISOString());
    if (!e2 && recTodayRows) {
      receipts_today_count = recTodayRows.length;
      receipts_today_total = recTodayRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    }
  } catch {
    /* receipts table optional */
  }

  res.json({
    period,
    total_orders: countPeriod,
    orders_today: countToday,
    total_revenue: revenuePeriod,
    revenue_today: revenueToday,
    avg_order_value: countPeriod ? (revenuePeriod / countPeriod).toFixed(2) : '0',
    completion_rate: countPeriod ? ((completedOrders / countPeriod) * 100).toFixed(1) : '0',
    orders_by_status,
    orders_by_status_rows,
    popular_items,
    hourly_orders,
    revenue_by_day,
    receipts_count,
    receipts_total,
    receipts_today_count,
    receipts_today_total,
  });
});

// ── Super Admin: pending venue registrations (List your venue) ─────────────
router.get('/venue-registrations', requireAuth, requireRole('super_admin'), async (req, res) => {
  const status = req.query.status ? String(req.query.status).trim() : 'pending';
  const allowed = ['pending', 'approved', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  const { data, error } = await supabase
    .from('venue_registration_requests')
    .select(
      'id, email, phone, address, vat_pan_number, restaurant_name, slug, owner_name, venue_type, status, created_at, reviewed_at',
    )
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) {
    if (String(error.message).includes('venue_registration_requests')) {
      return res.status(501).json({
        error:
          'Apply migration 017_venue_registration_and_order_display.sql (venue_registration_requests table).',
      });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

router.post('/venue-registrations/:id/approve', requireAuth, requireRole('super_admin'), async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(501).json({ error: 'SUPABASE_SERVICE_ROLE_KEY required for provisioning.' });
  }

  const { data: row, error: fetchErr } = await supabase
    .from('venue_registration_requests')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!row) return res.status(404).json({ error: 'Pending request not found' });

  let password;
  try {
    password = decryptRegistrationSecret(row.password_encrypted);
  } catch {
    return res.status(500).json({ error: 'Could not read stored credentials. Reject and ask them to re-apply.' });
  }

  const result = await provisionRestaurantOwner({
    supabaseUrl: url,
    serviceKey,
    email: row.email,
    password,
    restaurant_name: row.restaurant_name,
    slugInput: row.slug,
    owner_name: row.owner_name,
    venue_type: row.venue_type,
    phone: row.phone,
    address: row.address,
    vat_pan_number: row.vat_pan_number,
  });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const { error: upErr } = await supabase
    .from('venue_registration_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user?.id || null,
    })
    .eq('id', row.id);

  if (upErr) return res.status(500).json({ error: upErr.message });

  res.json({ restaurant: result.restaurant, message: 'Venue provisioned. Owner can sign in.' });
});

router.post('/venue-registrations/:id/reject', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data: row, error: fetchErr } = await supabase
    .from('venue_registration_requests')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!row) return res.status(404).json({ error: 'Pending request not found' });

  const { error: upErr } = await supabase
    .from('venue_registration_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user?.id || null,
    })
    .eq('id', row.id);

  if (upErr) return res.status(500).json({ error: upErr.message });

  const { subject, text, html } = venueRegistrationRejectedContent({
    ownerName: row.owner_name,
    email: row.email,
  });
  sendGuestEmail({ to: row.email, subject, text, html }).then((r) => {
    if (r?.skipped) console.warn('[email] skipped venue reject', r.reason);
    else if (r && !r.ok) console.warn('[email] failed venue reject', r.error || 'unknown');
  }).catch(() => {});

  res.json({ ok: true, message: 'Request rejected; applicant was emailed.' });
});

export default router;
