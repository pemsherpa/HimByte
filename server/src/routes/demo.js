/**
 * Himbyte Demo Router
 * Serves fully mock data aligned to the exact Supabase schema.
 * Activated when SUPABASE_URL env var is not set.
 */
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001';

/* ── Restaurant ─────────────────────────────────────────── */
const RESTAURANT = {
  id: RESTAURANT_ID,
  name: 'Himalayan Kitchen & Lodge',
  slug: 'himalayan-kitchen',
  logo_url: null,
  address: 'Thamel Marg, Kathmandu',
  phone: '+977-1-4567890',
  vat_pan_number: '123456789',   // new schema: single field
  is_active: true,
  venue_type: 'hotel',
  created_at: '2026-01-15T00:00:00Z',
};

/* ── Tables & Rooms (tables_rooms schema) ───────────────── */
const APP_URL = process.env.APP_URL || 'http://localhost:5174';

const TABLES_ROOMS = [
  { id: 'tr001', restaurant_id: RESTAURANT_ID, identifier: 'Table 1',  type: 'table' },
  { id: 'tr002', restaurant_id: RESTAURANT_ID, identifier: 'Table 2',  type: 'table' },
  { id: 'tr003', restaurant_id: RESTAURANT_ID, identifier: 'Table 3',  type: 'table' },
  { id: 'tr004', restaurant_id: RESTAURANT_ID, identifier: 'Table 4',  type: 'table' },
  { id: 'tr005', restaurant_id: RESTAURANT_ID, identifier: 'Table 5',  type: 'table' },
  { id: 'tr006', restaurant_id: RESTAURANT_ID, identifier: 'Room 101', type: 'room'  },
  { id: 'tr007', restaurant_id: RESTAURANT_ID, identifier: 'Room 102', type: 'room'  },
  { id: 'tr008', restaurant_id: RESTAURANT_ID, identifier: 'Room 201', type: 'room'  },
].map((t) => ({ ...t, qr_code_url: `${APP_URL}/scan?r=himalayan-kitchen&loc=${t.id}` }));

/* ── Categories (is_service_category schema) ─────────────── */
const CATEGORIES = [
  { id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Starters',     description: 'Light bites & appetisers',   priority: 1, is_service_category: false, created_at: '2026-01-15T00:00:00Z' },
  { id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Main Course',  description: 'Hearty Nepali mains',        priority: 2, is_service_category: false, created_at: '2026-01-15T00:00:00Z' },
  { id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Drinks',       description: 'Hot, cold & traditional',    priority: 3, is_service_category: false, created_at: '2026-01-15T00:00:00Z' },
  { id: 'cat004', restaurant_id: RESTAURANT_ID, name: 'Desserts',     description: 'Sweet endings',              priority: 4, is_service_category: false, created_at: '2026-01-15T00:00:00Z' },
  { id: 'cat005', restaurant_id: RESTAURANT_ID, name: 'Room Service', description: 'Meals delivered to rooms',   priority: 1, is_service_category: true,  created_at: '2026-01-15T00:00:00Z' },
  { id: 'cat006', restaurant_id: RESTAURANT_ID, name: 'Housekeeping', description: 'Hotel service requests',     priority: 2, is_service_category: true,  created_at: '2026-01-15T00:00:00Z' },
];

/* ── Menu Items ───────────────────────────────────────────── */
const MENU_ITEMS = [
  // Starters
  { id: 'm001', category_id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Steam Momo',     description: 'Classic Nepali steamed dumplings filled with seasoned chicken & herbs',          price: 250, image_url: null, is_available: true },
  { id: 'm002', category_id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Fried Momo',     description: 'Crispy fried dumplings served with spicy tomato achar',                          price: 280, image_url: null, is_available: true },
  { id: 'm003', category_id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Chatamari',      description: 'Newari rice crepe with minced meat and egg — the "Nepali pizza"',                price: 320, image_url: null, is_available: true },
  { id: 'm004', category_id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Aloo Achar',     description: 'Spiced potato salad with sesame, lemon, and green chilli',                       price: 150, image_url: null, is_available: true },
  { id: 'm005', category_id: 'cat001', restaurant_id: RESTAURANT_ID, name: 'Paneer Pakoda',  description: 'Crispy battered cottage cheese fritters with coriander chutney',                 price: 220, image_url: null, is_available: true },

  // Main Course
  { id: 'm006', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Dal Bhat Set',   description: 'The complete Nepali meal — lentils, rice, seasonal veg, pickle & papad',        price: 450, image_url: null, is_available: true },
  { id: 'm007', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Thakali Set',    description: 'Premium Thakali-style with gundruk, dhido, mustard greens & mutton curry',       price: 650, image_url: null, is_available: true },
  { id: 'm008', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Newari Khaja',   description: 'Traditional feast — choila, baji, bara, achar & more on a sal-leaf plate',      price: 550, image_url: null, is_available: true },
  { id: 'm009', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Chicken Sekuwa', description: 'Smoky grilled chicken skewers marinated in Nepali highland spices',              price: 480, image_url: null, is_available: true },
  { id: 'm010', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Thukpa',         description: 'Hearty Tibetan noodle soup with vegetables, broth & hand-pulled noodles',        price: 350, image_url: null, is_available: true },
  { id: 'm011', category_id: 'cat002', restaurant_id: RESTAURANT_ID, name: 'Kwati Soup',     description: 'Nine-bean wholesome Newari soup — packed with protein',                          price: 300, image_url: null, is_available: false },

  // Drinks
  { id: 'm012', category_id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Masala Chiya',   description: 'Traditional Nepali spiced milk tea brewed with cardamom, ginger & cinnamon',    price: 80,  image_url: null, is_available: true },
  { id: 'm013', category_id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Sweet Lassi',    description: 'Thick chilled yogurt drink blended with honey and rose water',                    price: 120, image_url: null, is_available: true },
  { id: 'm014', category_id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Lime Soda',      description: 'Freshly squeezed lime with soda water, salt, sugar & mint',                      price: 100, image_url: null, is_available: true },
  { id: 'm015', category_id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Tongba',         description: 'Fermented millet hot drink served in a traditional bamboo vessel',               price: 350, image_url: null, is_available: true },
  { id: 'm016', category_id: 'cat003', restaurant_id: RESTAURANT_ID, name: 'Himalayan Water', description: 'Still or sparkling mountain spring water',                                       price: 60,  image_url: null, is_available: true },

  // Desserts
  { id: 'm017', category_id: 'cat004', restaurant_id: RESTAURANT_ID, name: 'Juju Dhau',      description: 'The "King of Yogurt" — creamy, sweetened curd set in clay pots from Bhaktapur', price: 180, image_url: null, is_available: true },
  { id: 'm018', category_id: 'cat004', restaurant_id: RESTAURANT_ID, name: 'Sel Roti',       description: 'Ring-shaped sweet rice bread, deep-fried to golden perfection',                 price: 120, image_url: null, is_available: true },
  { id: 'm019', category_id: 'cat004', restaurant_id: RESTAURANT_ID, name: 'Rice Kheer',     description: 'Slow-cooked rice pudding with cardamom, saffron, and roasted cashews',          price: 150, image_url: null, is_available: true },

  // Room Service
  { id: 'm020', category_id: 'cat005', restaurant_id: RESTAURANT_ID, name: 'RS – Dal Bhat',  description: 'Full Nepali meal delivered hot to your room (+Rs.50 service charge)',           price: 500, image_url: null, is_available: true },
  { id: 'm021', category_id: 'cat005', restaurant_id: RESTAURANT_ID, name: 'RS – Momo',      description: 'Steam or fried momos with achar, delivered to your door',                       price: 300, image_url: null, is_available: true },
  { id: 'm022', category_id: 'cat005', restaurant_id: RESTAURANT_ID, name: 'RS – Thukpa',    description: 'Hot noodle soup – perfect for cold mountain nights',                            price: 380, image_url: null, is_available: true },
];

/* ── Seed orders for demo ─────────────────────────────────── */
const orders = [
  {
    id: 'ord001',
    restaurant_id: RESTAURANT_ID,
    table_room_id: 'tr001',
    status: 'pending',
    total_price: 780,
    notes: 'Extra spicy please',
    created_at: new Date(Date.now() - 4 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60000).toISOString(),
    tables_rooms: { identifier: 'Table 1', type: 'table' },
    order_items: [
      { id: 'oi001', order_id: 'ord001', menu_item_id: 'm001', quantity: 2, price_at_time: 250, menu_items: { name: 'Steam Momo', image_url: null } },
      { id: 'oi002', order_id: 'ord001', menu_item_id: 'm012', quantity: 2, price_at_time: 80,  menu_items: { name: 'Masala Chiya', image_url: null } },
      { id: 'oi003', order_id: 'ord001', menu_item_id: 'm004', quantity: 1, price_at_time: 150, menu_items: { name: 'Aloo Achar', image_url: null } },
    ],
  },
  {
    id: 'ord002',
    restaurant_id: RESTAURANT_ID,
    table_room_id: 'tr003',
    status: 'pending',
    total_price: 1100,
    notes: null,
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    tables_rooms: { identifier: 'Table 3', type: 'table' },
    order_items: [
      { id: 'oi004', order_id: 'ord002', menu_item_id: 'm007', quantity: 1, price_at_time: 650, menu_items: { name: 'Thakali Set', image_url: null } },
      { id: 'oi005', order_id: 'ord002', menu_item_id: 'm006', quantity: 1, price_at_time: 450, menu_items: { name: 'Dal Bhat Set', image_url: null } },
    ],
  },
  {
    id: 'ord003',
    restaurant_id: RESTAURANT_ID,
    table_room_id: 'tr006',
    status: 'approved',
    total_price: 800,
    notes: 'Room service — quiet please',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
    tables_rooms: { identifier: 'Room 101', type: 'room' },
    order_items: [
      { id: 'oi006', order_id: 'ord003', menu_item_id: 'm020', quantity: 1, price_at_time: 500, menu_items: { name: 'RS – Dal Bhat', image_url: null } },
      { id: 'oi007', order_id: 'ord003', menu_item_id: 'm021', quantity: 1, price_at_time: 300, menu_items: { name: 'RS – Momo', image_url: null } },
    ],
  },
  {
    id: 'ord004',
    restaurant_id: RESTAURANT_ID,
    table_room_id: 'tr002',
    status: 'preparing',
    total_price: 930,
    notes: null,
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60000).toISOString(),
    tables_rooms: { identifier: 'Table 2', type: 'table' },
    order_items: [
      { id: 'oi008', order_id: 'ord004', menu_item_id: 'm009', quantity: 1, price_at_time: 480, menu_items: { name: 'Chicken Sekuwa', image_url: null } },
      { id: 'oi009', order_id: 'ord004', menu_item_id: 'm008', quantity: 1, price_at_time: 550, menu_items: { name: 'Newari Khaja', image_url: null } },
    ],
  },
  {
    id: 'ord005',
    restaurant_id: RESTAURANT_ID,
    table_room_id: 'tr004',
    status: 'served',
    total_price: 630,
    notes: null,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60000).toISOString(),
    tables_rooms: { identifier: 'Table 4', type: 'table' },
    order_items: [
      { id: 'oi010', order_id: 'ord005', menu_item_id: 'm003', quantity: 1, price_at_time: 320, menu_items: { name: 'Chatamari', image_url: null } },
      { id: 'oi011', order_id: 'ord005', menu_item_id: 'm013', quantity: 1, price_at_time: 120, menu_items: { name: 'Sweet Lassi', image_url: null } },
      { id: 'oi012', order_id: 'ord005', menu_item_id: 'm017', quantity: 1, price_at_time: 180, menu_items: { name: 'Juju Dhau', image_url: null } },
    ],
  },
];

/* ── Guest / hotel service requests (in-memory) ─────────── */
const serviceRequests = [];

/* ─── ROUTES ─────────────────────────────────────────────── */

// GET /api/restaurants/:slug
router.get('/restaurants/:slug', (req, res) => {
  if (req.params.slug === RESTAURANT.slug || req.params.slug === RESTAURANT.id) {
    return res.json(RESTAURANT);
  }
  res.status(404).json({ error: 'Restaurant not found' });
});

// GET /api/restaurants/:id/tables_rooms
router.get('/restaurants/:id/tables_rooms', (req, res) => {
  const type = req.query.type;
  let list = TABLES_ROOMS;
  if (type) list = list.filter((t) => t.type === type);
  res.json(list);
});

// GET /api/menu/:restaurantId/categories
router.get('/menu/:restaurantId/categories', (req, res) => {
  let cats = [...CATEGORIES].sort((a, b) => a.priority - b.priority);
  const serviceOnly = req.query.service;
  if (serviceOnly === 'true')  cats = cats.filter((c) => c.is_service_category);
  if (serviceOnly === 'false') cats = cats.filter((c) => !c.is_service_category);
  res.json(cats);
});

// GET /api/menu/:restaurantId/items
router.get('/menu/:restaurantId/items', (req, res) => {
  let items = MENU_ITEMS;
  if (req.query.category_id) items = items.filter((i) => i.category_id === req.query.category_id);
  if (req.query.available !== 'false') items = items.filter((i) => i.is_available);
  res.json(items);
});

// POST /api/orders  — place order (anonymous guest)
router.post('/orders', (req, res) => {
  const { restaurant_id, table_room_id, items = [], notes, guest_phone, guest_email } = req.body;
  if (!items.length) return res.status(400).json({ error: 'Order must have at least one item' });

  const total_price = items.reduce((s, i) => s + i.price_at_time * i.quantity, 0);
  const tableRoom = TABLES_ROOMS.find((t) => t.id === table_room_id);

  const order = {
    id: crypto.randomUUID(),
    restaurant_id: restaurant_id || RESTAURANT_ID,
    table_room_id: table_room_id || null,
    status: 'pending',
    total_price,
    notes: notes || null,
    guest_phone: guest_phone || null,
    guest_email: guest_email || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tables_rooms: tableRoom ? { identifier: tableRoom.identifier, type: tableRoom.type } : null,
    session_id: req.body.session_id || null,
    order_items: items.map((i) => {
      const menuItem = MENU_ITEMS.find((m) => m.id === i.menu_item_id);
      return {
        id: crypto.randomUUID(),
        order_id: null,
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        price_at_time: i.price_at_time,   // schema field
        menu_items: menuItem ? { name: menuItem.name, image_url: menuItem.image_url } : null,
      };
    }),
  };

  orders.unshift(order);
  res.status(201).json(order);
});

// GET /api/orders/track/:sessionId  — guest tracks own order
router.get('/orders/track/:sessionId', (req, res) => {
  res.json(orders.filter((o) => o.session_id === req.params.sessionId));
});

// GET /api/orders/restaurant/:restaurantId  — staff: all orders
router.get('/orders/restaurant/:restaurantId', (req, res) => {
  let result = orders.filter((o) => o.restaurant_id === req.params.restaurantId);
  if (req.query.status) result = result.filter((o) => o.status === req.query.status);
  res.json(result);
});

// PATCH /api/orders/:orderId/status  — staff update
router.patch('/orders/:orderId/status', (req, res) => {
  const order = orders.find((o) => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  order.updated_at = new Date().toISOString();
  res.json(order);
});

// POST /api/service-requests
router.post('/service-requests', (req, res) => {
  const rid = req.body.restaurant_id || RESTAURANT_ID;
  const tr = TABLES_ROOMS.find((t) => t.id === req.body.table_room_id);
  const sr = {
    id: crypto.randomUUID(),
    restaurant_id: rid,
    table_room_id: req.body.table_room_id || null,
    service_type: req.body.service_type,
    status: 'requested',
    notes: req.body.notes || null,
    session_id: req.body.session_id || null,
    created_at: new Date().toISOString(),
    tables_rooms: tr ? { identifier: tr.identifier, type: tr.type } : null,
  };
  serviceRequests.unshift(sr);
  res.status(201).json(sr);
});

// GET /api/service-requests/restaurant/:restaurantId — staff inbox
router.get('/service-requests/restaurant/:restaurantId', (req, res) => {
  const list = serviceRequests.filter((r) => r.restaurant_id === req.params.restaurantId);
  res.json(list);
});

// PATCH /api/service-requests/:id/status
router.patch('/service-requests/:id/status', (req, res) => {
  const r = serviceRequests.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  r.status = req.body.status;
  res.json(r);
});

/* ── Admin ──────────────────────────────────────────────── */

// GET /api/admin/restaurants
router.get('/admin/restaurants', (req, res) => {
  res.json([
    { ...RESTAURANT, staff_count: 3, order_count_today: orders.filter((o) => {
        const d = new Date(o.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length },
  ]);
});

// GET /api/admin/analytics
router.get('/admin/analytics', (req, res) => {
  const allOrders = orders.filter((o) => o.status !== 'cancelled');
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const servedOrders = orders.filter((o) => o.status === 'served');

  res.json({
    total_restaurants: 1,
    active_restaurants: 1,
    total_orders: orders.length,
    orders_today: todayOrders.length,
    total_revenue: allOrders.reduce((s, o) => s + Number(o.total_price), 0),
    revenue_today: todayOrders.reduce((s, o) => s + Number(o.total_price), 0),
    avg_order_value: allOrders.length ? Math.round(allOrders.reduce((s, o) => s + Number(o.total_price), 0) / allOrders.length) : 0,
    completion_rate: orders.length ? Math.round((servedOrders.length / orders.length) * 100) : 0,
    popular_items: [
      { name: 'Steam Momo',    orders: 28 },
      { name: 'Dal Bhat Set',  orders: 22 },
      { name: 'Masala Chiya',  orders: 19 },
      { name: 'Thakali Set',   orders: 14 },
      { name: 'Chicken Sekuwa',orders: 11 },
    ],
    hourly_orders: [
      { hour: '10AM', count: 3 }, { hour: '11AM', count: 5 }, { hour: '12PM', count: 9 },
      { hour: '1PM',  count: 12 },{ hour: '2PM',  count: 7 }, { hour: '3PM',  count: 4 },
      { hour: '4PM',  count: 6 }, { hour: '5PM',  count: 8 }, { hour: '6PM',  count: 11 },
      { hour: '7PM',  count: 14 },{ hour: '8PM',  count: 10 },{ hour: '9PM',  count: 6 },
    ],
  });
});

// GET /api/admin/restaurant-analytics/:restaurantId — merchant Analytics page
router.get('/admin/restaurant-analytics/:restaurantId', (req, res) => {
  const period = String(req.query.period || 'lifetime').toLowerCase();
  const allOrders = orders.filter((o) => o.status !== 'cancelled');
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= startUtc);

  let periodOrders = allOrders;
  if (period === 'today') {
    periodOrders = todayOrders;
  } else if (period === 'week') {
    const t = new Date(now);
    t.setUTCDate(t.getUTCDate() - 7);
    periodOrders = allOrders.filter((o) => new Date(o.created_at) >= t);
  } else if (period === 'month') {
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    periodOrders = allOrders.filter((o) => new Date(o.created_at) >= t);
  } else if (period === 'year') {
    const t = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    periodOrders = allOrders.filter((o) => new Date(o.created_at) >= t);
  }

  const revenuePeriod = periodOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const revenueToday = todayOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const completed = periodOrders.filter((o) => o.status === 'served').length;

  const orders_by_status = periodOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const status_order = ['pending', 'approved', 'preparing', 'ready', 'served', 'cancelled'];
  const orders_by_status_rows = status_order.map((status) => ({
    status,
    count: orders_by_status[status] || 0,
  }));

  const byDay = {};
  for (const o of periodOrders) {
    const key = (o.created_at || '').slice(0, 10);
    if (!key) continue;
    if (!byDay[key]) byDay[key] = { revenue: 0, orders: 0 };
    byDay[key].orders += 1;
    byDay[key].revenue += Number(o.total_price || 0);
  }
  const endDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13));
  if (period === 'today') {
    chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (period === 'week') {
    chartStart = new Date(now);
    chartStart.setUTCDate(chartStart.getUTCDate() - 6);
  } else if (period === 'month') {
    chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (period === 'year') {
    chartStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
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

  res.json({
    period,
    total_orders: periodOrders.length,
    orders_today: todayOrders.length,
    total_revenue: revenuePeriod,
    revenue_today: revenueToday,
    avg_order_value: periodOrders.length ? (revenuePeriod / periodOrders.length).toFixed(2) : '0',
    completion_rate: periodOrders.length ? ((completed / periodOrders.length) * 100).toFixed(1) : '0',
    orders_by_status,
    orders_by_status_rows,
    popular_items: [
      { name: 'Steam Momo', orders: 28 },
      { name: 'Dal Bhat Set', orders: 22 },
    ],
    hourly_orders: Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}`,
      count: todayOrders.filter((o) => new Date(o.created_at).getHours() === h).length,
    })),
    revenue_by_day,
  });
});

// PATCH /api/admin/menu-items/:id/toggle
router.patch('/admin/menu-items/:id/toggle', (req, res) => {
  const item = MENU_ITEMS.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.is_available = !item.is_available;
  res.json(item);
});

// GET /api/admin/menu-items  — all items (including unavailable)
router.get('/admin/menu-items/:restaurantId', (req, res) => {
  const list = MENU_ITEMS.map((m) => {
    const cat = CATEGORIES.find((c) => c.id === m.category_id);
    return { ...m, categories: cat ? { name: cat.name } : { name: '—' } };
  });
  res.json(list);
});

/* ── Owner: vendors, payables, HR (demo) ─────────────────── */

let demoVendors = [
  {
    id: 'ven-demo-1',
    restaurant_id: RESTAURANT_ID,
    name: 'Himalayan Produce Co.',
    contact_phone: '+977-1-4000000',
    contact_email: 'accounts@himalayanproduce.np',
    notes: 'Weekly vegetable & dairy',
    created_at: new Date().toISOString(),
  },
];

let demoVendorPayables = [
  {
    id: 'vp-demo-1',
    restaurant_id: RESTAURANT_ID,
    vendor_id: 'ven-demo-1',
    vendor_name: 'Himalayan Produce Co.',
    description: 'March supply invoice',
    amount_due: 125000,
    due_date: '2026-04-18',
    status: 'open',
    paid_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'vp-demo-2',
    restaurant_id: RESTAURANT_ID,
    vendor_id: null,
    vendor_name: 'City Gas',
    description: 'Cylinder refill',
    amount_due: 8500,
    due_date: '2026-04-10',
    status: 'open',
    paid_at: null,
    created_at: new Date().toISOString(),
  },
];

let demoEmployees = [
  {
    id: 'emp-demo-1',
    restaurant_id: RESTAURANT_ID,
    profile_id: null,
    full_name: 'Sita Magar',
    email: 'sita@example.com',
    phone: '+977-9800000001',
    designation: 'Head Chef',
    department: 'Kitchen',
    hire_date: '2024-06-01',
    salary_amount: 55000,
    salary_period: 'monthly',
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-demo-2',
    restaurant_id: RESTAURANT_ID,
    profile_id: null,
    full_name: 'Rajesh Thapa',
    email: null,
    phone: '+977-9800000002',
    designation: 'Service',
    department: 'Floor',
    hire_date: '2025-01-15',
    salary_amount: 28000,
    salary_period: 'monthly',
    notes: 'Training period completed',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let demoEmploymentHistory = [
  {
    id: 'eh-demo-1',
    restaurant_id: RESTAURANT_ID,
    employee_id: 'emp-demo-1',
    title: 'Head Chef',
    department: 'Kitchen',
    start_date: '2024-06-01',
    end_date: null,
    notes: 'Promotion from sous chef',
    created_at: new Date().toISOString(),
  },
  {
    id: 'eh-demo-2',
    restaurant_id: RESTAURANT_ID,
    employee_id: 'emp-demo-1',
    title: 'Sous Chef',
    department: 'Kitchen',
    start_date: '2022-03-01',
    end_date: '2024-05-31',
    notes: null,
    created_at: new Date().toISOString(),
  },
];

let demoEmployeeShifts = [
  {
    id: 'es-demo-1',
    restaurant_id: RESTAURANT_ID,
    employee_id: 'emp-demo-1',
    weekday: 1,
    start_time: '10:00:00',
    end_time: '18:00:00',
    notes: 'Kitchen — weekday',
    created_at: new Date().toISOString(),
  },
  {
    id: 'es-demo-2',
    restaurant_id: RESTAURANT_ID,
    employee_id: 'emp-demo-1',
    weekday: 6,
    start_time: '11:00:00',
    end_time: '20:00:00',
    notes: 'Saturday service',
    created_at: new Date().toISOString(),
  },
  {
    id: 'es-demo-3',
    restaurant_id: RESTAURANT_ID,
    employee_id: 'emp-demo-2',
    weekday: 0,
    start_time: '08:00:00',
    end_time: '16:00:00',
    notes: null,
    created_at: new Date().toISOString(),
  },
];

router.get('/owner/:restaurantId/vendors', (req, res) => {
  res.json(demoVendors.filter((v) => v.restaurant_id === req.params.restaurantId));
});

router.post('/owner/:restaurantId/vendors', (req, res) => {
  const row = {
    id: crypto.randomUUID(),
    restaurant_id: req.params.restaurantId,
    name: String(req.body.name || '').trim(),
    contact_phone: req.body.contact_phone || null,
    contact_email: req.body.contact_email || null,
    notes: req.body.notes || null,
    created_at: new Date().toISOString(),
  };
  if (!row.name) return res.status(400).json({ error: 'name is required' });
  demoVendors.push(row);
  res.status(201).json(row);
});

router.patch('/owner/:restaurantId/vendors/:id', (req, res) => {
  const v = demoVendors.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (req.body.name !== undefined) v.name = String(req.body.name).trim();
  if (req.body.contact_phone !== undefined) v.contact_phone = req.body.contact_phone;
  if (req.body.contact_email !== undefined) v.contact_email = req.body.contact_email;
  if (req.body.notes !== undefined) v.notes = req.body.notes;
  res.json(v);
});

router.get('/owner/:restaurantId/vendor-payables', (req, res) => {
  res.json(demoVendorPayables.filter((p) => p.restaurant_id === req.params.restaurantId));
});

router.post('/owner/:restaurantId/vendor-payables', (req, res) => {
  const vn = String(req.body.vendor_name || '').trim();
  if (!vn || req.body.amount_due == null || !req.body.due_date) {
    return res.status(400).json({ error: 'vendor_name, amount_due, and due_date are required' });
  }
  const row = {
    id: crypto.randomUUID(),
    restaurant_id: req.params.restaurantId,
    vendor_id: req.body.vendor_id || null,
    vendor_name: vn,
    description: req.body.description || null,
    amount_due: Number(req.body.amount_due),
    due_date: String(req.body.due_date).slice(0, 10),
    status: 'open',
    paid_at: null,
    created_at: new Date().toISOString(),
  };
  demoVendorPayables.push(row);
  res.status(201).json(row);
});

router.patch('/owner/:restaurantId/vendor-payables/:id', (req, res) => {
  const p = demoVendorPayables.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (req.body.vendor_name !== undefined) p.vendor_name = String(req.body.vendor_name).trim();
  if (req.body.description !== undefined) p.description = req.body.description;
  if (req.body.amount_due !== undefined) p.amount_due = Number(req.body.amount_due);
  if (req.body.due_date !== undefined) p.due_date = String(req.body.due_date).slice(0, 10);
  if (req.body.status !== undefined) {
    p.status = req.body.status;
    p.paid_at = req.body.status === 'paid' ? new Date().toISOString() : null;
  }
  res.json(p);
});

router.get('/owner/:restaurantId/employees', (req, res) => {
  res.json(demoEmployees.filter((e) => e.restaurant_id === req.params.restaurantId));
});

router.post('/owner/:restaurantId/employees', (req, res) => {
  if (!req.body.full_name) return res.status(400).json({ error: 'full_name is required' });
  const row = {
    id: crypto.randomUUID(),
    restaurant_id: req.params.restaurantId,
    profile_id: null,
    full_name: String(req.body.full_name).trim(),
    email: req.body.email || null,
    phone: req.body.phone || null,
    designation: req.body.designation || null,
    department: req.body.department || null,
    hire_date: req.body.hire_date || null,
    salary_amount: req.body.salary_amount != null ? Number(req.body.salary_amount) : null,
    salary_period: req.body.salary_period === 'daily' ? 'daily' : 'monthly',
    notes: req.body.notes || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoEmployees.push(row);
  res.status(201).json(row);
});

router.patch('/owner/:restaurantId/employees/:id', (req, res) => {
  const e = demoEmployees.find((x) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  if (b.full_name !== undefined) e.full_name = String(b.full_name).trim();
  if (b.email !== undefined) e.email = b.email;
  if (b.phone !== undefined) e.phone = b.phone;
  if (b.designation !== undefined) e.designation = b.designation;
  if (b.department !== undefined) e.department = b.department;
  if (b.hire_date !== undefined) e.hire_date = b.hire_date;
  if (b.salary_amount !== undefined) e.salary_amount = b.salary_amount == null ? null : Number(b.salary_amount);
  if (b.salary_period !== undefined) e.salary_period = b.salary_period === 'daily' ? 'daily' : 'monthly';
  if (b.notes !== undefined) e.notes = b.notes;
  if (b.is_active !== undefined) e.is_active = !!b.is_active;
  e.updated_at = new Date().toISOString();
  res.json(e);
});

router.get('/owner/:restaurantId/employees/:employeeId/employment-history', (req, res) => {
  res.json(
    demoEmploymentHistory.filter(
      (h) => h.restaurant_id === req.params.restaurantId && h.employee_id === req.params.employeeId,
    ),
  );
});

router.post('/owner/:restaurantId/employment-history', (req, res) => {
  const { employee_id, title, start_date } = req.body;
  if (!employee_id || !title || !start_date) {
    return res.status(400).json({ error: 'employee_id, title, and start_date are required' });
  }
  const row = {
    id: crypto.randomUUID(),
    restaurant_id: req.params.restaurantId,
    employee_id,
    title: String(title).trim(),
    department: req.body.department || null,
    start_date: String(start_date).slice(0, 10),
    end_date: req.body.end_date ? String(req.body.end_date).slice(0, 10) : null,
    notes: req.body.notes || null,
    created_at: new Date().toISOString(),
  };
  demoEmploymentHistory.push(row);
  res.status(201).json(row);
});

router.get('/owner/:restaurantId/employees/:employeeId/shifts', (req, res) => {
  const list = demoEmployeeShifts.filter(
    (s) => s.restaurant_id === req.params.restaurantId && s.employee_id === req.params.employeeId,
  );
  list.sort((a, b) => a.weekday - b.weekday || String(a.start_time).localeCompare(String(b.start_time)));
  res.json(list);
});

router.post('/owner/:restaurantId/employees/:employeeId/shifts', (req, res) => {
  const wd = Number(req.body.weekday);
  if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
    return res.status(400).json({ error: 'weekday must be 0–6 (Sun–Sat)' });
  }
  if (!req.body.start_time || !req.body.end_time) {
    return res.status(400).json({ error: 'start_time and end_time are required' });
  }
  const emp = demoEmployees.find((e) => e.id === req.params.employeeId && e.restaurant_id === req.params.restaurantId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  const normTime = (x) => {
    const m = String(x).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '09:00:00';
    const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
    const min = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0');
    return `${h}:${min}:00`;
  };
  const start_time = normTime(req.body.start_time);
  const end_time = normTime(req.body.end_time);
  if (start_time >= end_time) {
    return res.status(400).json({ error: 'End time must be after start time (same day)' });
  }
  const row = {
    id: crypto.randomUUID(),
    restaurant_id: req.params.restaurantId,
    employee_id: req.params.employeeId,
    weekday: wd,
    start_time,
    end_time,
    notes: req.body.notes || null,
    created_at: new Date().toISOString(),
  };
  demoEmployeeShifts.push(row);
  res.status(201).json(row);
});

router.patch('/owner/:restaurantId/employee-shifts/:id', (req, res) => {
  const s = demoEmployeeShifts.find((x) => x.id === req.params.id && x.restaurant_id === req.params.restaurantId);
  if (!s) return res.status(404).json({ error: 'Shift not found' });
  const norm = (x) => {
    const m = String(x).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return s.start_time;
    const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
    const min = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0');
    return `${h}:${min}:00`;
  };
  if (req.body.weekday !== undefined) {
    const wd = Number(req.body.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) return res.status(400).json({ error: 'weekday must be 0–6' });
    s.weekday = wd;
  }
  if (req.body.start_time !== undefined) s.start_time = norm(req.body.start_time);
  if (req.body.end_time !== undefined) s.end_time = norm(req.body.end_time);
  if (req.body.notes !== undefined) s.notes = req.body.notes;
  if (s.start_time >= s.end_time) return res.status(400).json({ error: 'End time must be after start time' });
  res.json(s);
});

router.delete('/owner/:restaurantId/employee-shifts/:id', (req, res) => {
  const i = demoEmployeeShifts.findIndex((x) => x.id === req.params.id && x.restaurant_id === req.params.restaurantId);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  demoEmployeeShifts.splice(i, 1);
  res.status(204).send();
});

router.delete('/owner/:restaurantId/employees/:id', (req, res) => {
  const e = demoEmployees.find((x) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  e.is_active = false;
  e.updated_at = new Date().toISOString();
  res.json(e);
});

// POST /api/admin/categories — demo
router.post('/admin/categories', (req, res) => {
  const { restaurant_id, name, description, priority, is_service_category } = req.body;
  if (!restaurant_id || !String(name || '').trim()) {
    return res.status(400).json({ error: 'restaurant_id and name are required' });
  }
  const row = {
    id: crypto.randomUUID(),
    restaurant_id,
    name: String(name).trim(),
    description: description || null,
    priority: priority != null ? Number(priority) : 0,
    is_service_category: !!is_service_category,
    created_at: new Date().toISOString(),
  };
  CATEGORIES.push(row);
  res.status(201).json(row);
});

// POST /api/admin/menu-items — demo
router.post('/admin/menu-items', (req, res) => {
  const { restaurant_id, category_id, name, description, price, is_available, image_url } = req.body;
  if (!restaurant_id || !category_id || !name || price === undefined || price === null) {
    return res.status(400).json({ error: 'restaurant_id, category_id, name, and price are required' });
  }
  const cat = CATEGORIES.find((c) => c.id === category_id);
  const row = {
    id: crypto.randomUUID(),
    category_id,
    restaurant_id,
    name: String(name).trim(),
    description: description || null,
    price: Number(price),
    image_url: image_url || null,
    is_available: is_available !== false,
    categories: cat ? { name: cat.name } : { name: '—' },
  };
  MENU_ITEMS.push(row);
  res.status(201).json(row);
});

// POST /api/restaurants/:restaurantId/tables_rooms — demo
router.post('/restaurants/:restaurantId/tables_rooms', (req, res) => {
  const { identifier, type = 'table' } = req.body;
  if (!identifier || !String(identifier).trim()) {
    return res.status(400).json({ error: 'identifier is required' });
  }
  const rid = req.params.restaurantId;
  const dup = TABLES_ROOMS.find((t) => t.restaurant_id === rid && t.identifier === String(identifier).trim());
  if (dup) {
    return res.status(409).json({ error: 'A table or room with this name already exists' });
  }
  const id = crypto.randomUUID();
  const row = {
    id,
    restaurant_id: rid,
    identifier: String(identifier).trim(),
    type: type === 'room' ? 'room' : 'table',
    qr_code_url: `${APP_URL}/scan?r=${RESTAURANT.slug}&loc=${id}`,
  };
  TABLES_ROOMS.push(row);
  res.status(201).json(row);
});

export default router;
