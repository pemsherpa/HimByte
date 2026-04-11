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
  const { restaurant_id, table_room_id, items = [], notes } = req.body;
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
  const sr = {
    id: crypto.randomUUID(),
    restaurant_id: RESTAURANT_ID,
    table_room_id: req.body.table_room_id,
    service_type: req.body.service_type,
    status: 'requested',
    created_at: new Date().toISOString(),
  };
  res.status(201).json(sr);
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

// PATCH /api/admin/menu-items/:id/toggle
router.patch('/admin/menu-items/:id/toggle', (req, res) => {
  const item = MENU_ITEMS.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.is_available = !item.is_available;
  res.json(item);
});

// GET /api/admin/menu-items  — all items (including unavailable)
router.get('/admin/menu-items/:restaurantId', (req, res) => {
  res.json(MENU_ITEMS);
});

export default router;
