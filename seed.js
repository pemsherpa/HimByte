/**
 * Himbyte — Production Seed Script
 * Seeds two real restaurants into your Supabase project.
 *
 * Usage:
 *   1. Fill in your Supabase credentials in .env
 *   2. Run: node seed.js
 *
 * Creates:
 *   • Hotel Tashi Delek, Dingboche  (slug: tashi-delek)
 *   • Ohana Cafe, Boudha            (slug: ohana-cafe)
 *   • Admin + Staff + Kitchen accounts for each
 *   • Full menu with categories
 *   • Tables & rooms with permanent QR URLs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL               = process.env.APP_URL || 'http://localhost:5174';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  Missing credentials. Copy .env.example → .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ── helpers ─────────────────────────────────────────────── */
function ok(label, data) { console.log(`  ✓ ${label}`); return data; }
function fail(label, err) { console.error(`  ✗ ${label}:`, err.message); throw err; }

async function createUser(email, password, fullName, role, restaurantId) {
  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      // User exists — look up their ID
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) {
        await supabase.from('profiles').upsert({ id: existing.id, restaurant_id: restaurantId, full_name: fullName, role });
        return existing;
      }
    }
    fail(`createUser(${email})`, authErr);
  }

  const user = authData.user;
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: user.id, restaurant_id: restaurantId, full_name: fullName, role,
  });
  if (profileErr) fail(`profile for ${email}`, profileErr);

  return user;
}

/* ── RESTAURANT DATA ─────────────────────────────────────── */

const RESTAURANTS = [

  /* ══════════════════════════════════════════════════════
     HOTEL TASHI DELEK · Dingboche
  ══════════════════════════════════════════════════════ */
  {
    restaurant: {
      name: 'Hotel Tashi Delek',
      slug: 'tashi-delek',
      logo_url: null,
      address: 'Dingboche Village, Solukhumbu, Everest Region',
      phone: '+977-9812345678',
      vat_pan_number: '302847561',
      is_active: true,
    },
    accounts: [
      { email: 'admin@tashidelek.com',   password: 'TashiDelek@2026',  name: 'Tashi Sherpa',     role: 'restaurant_admin' },
      { email: 'staff@tashidelek.com',   password: 'TDStaff@2026',     name: 'Dawa Lama',        role: 'staff'            },
      { email: 'kitchen@tashidelek.com', password: 'TDKitchen@2026',   name: 'Mingma Dorje',     role: 'staff'            },
    ],
    tables: [
      { identifier: 'Table 1', type: 'table' },
      { identifier: 'Table 2', type: 'table' },
      { identifier: 'Table 3', type: 'table' },
      { identifier: 'Table 4', type: 'table' },
      { identifier: 'Table 5', type: 'table' },
      { identifier: 'Table 6', type: 'table' },
      { identifier: 'Room 101', type: 'room' },
      { identifier: 'Room 102', type: 'room' },
      { identifier: 'Room 103', type: 'room' },
      { identifier: 'Room 201', type: 'room' },
      { identifier: 'Room 202', type: 'room' },
      { identifier: 'Room 203', type: 'room' },
    ],
    categories: [
      { name: 'Breakfast',         description: 'Start your Himalayan day right',          priority: 1, is_service_category: false },
      { name: 'Soups & Starters',  description: 'Warm up after the trail',                 priority: 2, is_service_category: false },
      { name: 'Main Course',       description: 'Hearty meals for trekkers',               priority: 3, is_service_category: false },
      { name: 'Hot Drinks',        description: 'Tea, coffee & warming brews',             priority: 4, is_service_category: false },
      { name: 'Cold Drinks',       description: 'Juices, sodas & lassi',                   priority: 5, is_service_category: false },
      { name: 'Desserts',          description: 'Sweet mountain endings',                  priority: 6, is_service_category: false },
      { name: 'Room Service',      description: 'Meals & drinks to your room',             priority: 1, is_service_category: true  },
      { name: 'Hotel Services',    description: 'Housekeeping & concierge',                priority: 2, is_service_category: true  },
    ],
    menuItems: [
      // Breakfast
      { cat: 'Breakfast',        name: 'Tibetan Tsampa Porridge', description: 'Roasted barley flour porridge with butter, sugar & dried fruit — the Everest sherpa staple', price: 350 },
      { cat: 'Breakfast',        name: 'Egg & Yak Butter Toast',  description: 'Two eggs (any style) with locally-churned yak butter on thick toast', price: 420 },
      { cat: 'Breakfast',        name: 'Pancakes with Honey',     description: 'Thick buckwheat pancakes served with Himalayan mountain honey', price: 380 },
      { cat: 'Breakfast',        name: 'Tibetan Bread (Tingmo)', description: 'Steamed Tibetan bread served with homemade jam and yak butter', price: 280 },
      { cat: 'Breakfast',        name: 'Müesli & Curd',           description: 'Rolled oats with fresh fruit, nuts and local curd', price: 320 },

      // Soups & Starters
      { cat: 'Soups & Starters', name: 'Sherpa Stew',             description: 'Traditional highland potato, yak meat and vegetable stew — slow cooked with mountain spices', price: 480 },
      { cat: 'Soups & Starters', name: 'Thukpa (Noodle Soup)',    description: 'Hand-pulled noodles in rich broth with chicken, vegetables, and highland herbs', price: 450 },
      { cat: 'Soups & Starters', name: 'Steam Momo (8 pcs)',      description: 'Traditional dumplings stuffed with yak meat or vegetables, served with spicy achar', price: 350 },
      { cat: 'Soups & Starters', name: 'Vegetable Pakoda',        description: 'Crispy battered mixed vegetables with mint chutney', price: 280 },

      // Main Course
      { cat: 'Main Course',      name: 'Dal Bhat Set',            description: 'Complete Nepali meal — lentil soup, rice, seasonal veg curry, pickle & papad (unlimited refills)', price: 650 },
      { cat: 'Main Course',      name: 'Yak Steak',               description: 'Pan-seared yak tenderloin with garlic butter, roasted potatoes and highland herbs', price: 1200 },
      { cat: 'Main Course',      name: 'Fried Rice with Yak',     description: 'Wok-fried rice with yak meat, egg, and seasonal vegetables', price: 550 },
      { cat: 'Main Course',      name: 'Sherpa Chow Mein',        description: 'Stir-fried egg noodles with yak meat or vegetables in highland sauce', price: 480 },
      { cat: 'Main Course',      name: 'Tibetan Gyathuk',         description: 'Thick Tibetan soup with hand-rolled pasta, meat and vegetables', price: 520 },
      { cat: 'Main Course',      name: 'Pasta Arrabiata',         description: 'Penne in spicy tomato sauce (trekker favourite)', price: 480 },

      // Hot Drinks
      { cat: 'Hot Drinks',       name: 'Butter Tea (Po Cha)',     description: 'Traditional Tibetan tea brewed with yak butter and salt — the Everest warming drink', price: 180 },
      { cat: 'Hot Drinks',       name: 'Masala Chiya',            description: 'Spiced Nepali milk tea with cardamom, ginger, cinnamon', price: 120 },
      { cat: 'Hot Drinks',       name: 'Black Coffee',            description: 'Strong mountain coffee', price: 150 },
      { cat: 'Hot Drinks',       name: 'Hot Chocolate',           description: 'Rich cocoa with powdered milk — perfect at 4360m', price: 200 },
      { cat: 'Hot Drinks',       name: 'Ginger Lemon Honey',      description: 'Fresh ginger, lemon juice and honey in hot water — altitude remedy', price: 160 },

      // Cold Drinks
      { cat: 'Cold Drinks',      name: 'Sweet Lassi',             description: 'Thick yogurt drink with sugar and cardamom', price: 200 },
      { cat: 'Cold Drinks',      name: 'Fresh Lemon Soda',        description: 'Lime, soda water, salt or sugar', price: 150 },
      { cat: 'Cold Drinks',      name: 'Tongba',                  description: 'Fermented millet brew in a bamboo vessel — the Himalayan classic', price: 450 },

      // Desserts
      { cat: 'Desserts',         name: 'Kheer',                   description: 'Creamy rice pudding with cardamom, saffron and roasted nuts', price: 220 },
      { cat: 'Desserts',         name: 'Apple Pie',               description: 'Warm Himalayan apple pie with local cinnamon and cream', price: 350 },
      { cat: 'Desserts',         name: 'Juju Dhau',               description: 'King of yogurt — sweetened clay-pot curd from Bhaktapur', price: 250 },

      // Room Service
      { cat: 'Room Service',     name: 'RS – Dal Bhat',           description: 'Full Nepali set meal delivered to your room', price: 750 },
      { cat: 'Room Service',     name: 'RS – Thukpa',             description: 'Hot noodle soup — perfect for cold Dingboche nights', price: 550 },
      { cat: 'Room Service',     name: 'RS – Butter Tea & Toast', description: 'Morning tray: butter tea + toast with jam', price: 350 },
    ],
  },

  /* ══════════════════════════════════════════════════════
     OHANA CAFE · Boudha
  ══════════════════════════════════════════════════════ */
  {
    restaurant: {
      name: 'Ohana Cafe',
      slug: 'ohana-cafe',
      logo_url: null,
      address: 'Boudhanath Stupa Road, Boudha, Kathmandu',
      phone: '+977-9801234567',
      vat_pan_number: '401928374',
      is_active: true,
    },
    accounts: [
      { email: 'admin@ohanacafe.com',   password: 'OhanaCafe@2026',  name: 'Priya Maharjan',   role: 'restaurant_admin' },
      { email: 'staff@ohanacafe.com',   password: 'OStaff@2026',     name: 'Rohan Shakya',     role: 'staff'            },
      { email: 'kitchen@ohanacafe.com', password: 'OKitchen@2026',   name: 'Sunita Tamang',    role: 'staff'            },
    ],
    tables: [
      { identifier: 'Table 1',  type: 'table' },
      { identifier: 'Table 2',  type: 'table' },
      { identifier: 'Table 3',  type: 'table' },
      { identifier: 'Table 4',  type: 'table' },
      { identifier: 'Table 5',  type: 'table' },
      { identifier: 'Table 6',  type: 'table' },
      { identifier: 'Table 7',  type: 'table' },
      { identifier: 'Table 8',  type: 'table' },
      { identifier: 'Stupa View 1', type: 'table' },
      { identifier: 'Stupa View 2', type: 'table' },
    ],
    categories: [
      { name: 'Coffee & Espresso', description: 'Single origin beans, brewed with love',   priority: 1, is_service_category: false },
      { name: 'Tea & Wellness',    description: 'Herbal, green, Himalayan & chai',          priority: 2, is_service_category: false },
      { name: 'Fresh Juices',      description: 'Cold-pressed & blended',                  priority: 3, is_service_category: false },
      { name: 'Breakfast',         description: 'All-day breakfast at Boudha',             priority: 4, is_service_category: false },
      { name: 'Light Bites',       description: 'Sandwiches, wraps & snacks',              priority: 5, is_service_category: false },
      { name: 'Mains',             description: 'Hearty plates — Nepali & world kitchen',  priority: 6, is_service_category: false },
      { name: 'Cakes & Desserts',  description: 'House-baked daily',                       priority: 7, is_service_category: false },
    ],
    menuItems: [
      // Coffee
      { cat: 'Coffee & Espresso', name: 'Espresso',              description: 'Double shot of Himalayan single-origin espresso', price: 180 },
      { cat: 'Coffee & Espresso', name: 'Cappuccino',            description: 'Espresso with steamed milk foam — house specialty', price: 280 },
      { cat: 'Coffee & Espresso', name: 'Flat White',            description: 'Double espresso with silky microfoam', price: 300 },
      { cat: 'Coffee & Espresso', name: 'Iced Latte',            description: 'Cold espresso with milk over ice', price: 320 },
      { cat: 'Coffee & Espresso', name: 'Café Mocha',            description: 'Espresso, chocolate and steamed milk', price: 340 },
      { cat: 'Coffee & Espresso', name: 'Cold Brew',             description: '24-hour cold steeped Nepali coffee', price: 350 },

      // Tea
      { cat: 'Tea & Wellness',    name: 'Masala Chiya',          description: 'Traditional Nepali spiced milk tea', price: 120 },
      { cat: 'Tea & Wellness',    name: 'Tibetan Butter Tea',    description: 'Yak butter tea — an Ohana signature', price: 200 },
      { cat: 'Tea & Wellness',    name: 'Ginger Turmeric Tea',   description: 'Fresh ginger and turmeric with honey — anti-inflammatory', price: 180 },
      { cat: 'Tea & Wellness',    name: 'Himalayan Green Tea',   description: 'Organic green tea from Ilam, Nepal', price: 160 },
      { cat: 'Tea & Wellness',    name: 'Chamomile & Lemon',     description: 'Calming chamomile with fresh lemon', price: 150 },

      // Juices
      { cat: 'Fresh Juices',      name: 'Mango Lassi',           description: 'Alphonso mango blended with fresh curd and cardamom', price: 280 },
      { cat: 'Fresh Juices',      name: 'Green Detox',           description: 'Spinach, cucumber, apple, ginger and lemon', price: 320 },
      { cat: 'Fresh Juices',      name: 'Watermelon Mint',       description: 'Fresh watermelon juice with mint and lime', price: 250 },
      { cat: 'Fresh Juices',      name: 'Banana Shake',          description: 'Banana, milk, honey and cinnamon', price: 280 },
      { cat: 'Fresh Juices',      name: 'Carrot Ginger Blend',   description: 'Cold-pressed carrot and fresh ginger', price: 290 },

      // Breakfast
      { cat: 'Breakfast',         name: 'Eggs Benedict',         description: 'Poached eggs on toasted sourdough with hollandaise and spinach', price: 580 },
      { cat: 'Breakfast',         name: 'Avocado Toast',         description: 'Smashed avocado on sourdough with chilli flakes, lemon and micro herbs', price: 520 },
      { cat: 'Breakfast',         name: 'Granola Bowl',          description: 'House-made granola with seasonal fruit, honey and coconut yogurt', price: 450 },
      { cat: 'Breakfast',         name: 'Sel Roti & Curd',       description: 'Traditional Nepali sweet rice bread with homemade yogurt and honey', price: 320 },
      { cat: 'Breakfast',         name: 'Full Ohana Breakfast',  description: 'Eggs, toast, grilled tomato, sausage, beans and orange juice', price: 780 },

      // Light Bites
      { cat: 'Light Bites',       name: 'Club Sandwich',         description: 'Triple-decker chicken club with fries', price: 620 },
      { cat: 'Light Bites',       name: 'Falafel Wrap',          description: 'Crispy falafel with tzatziki, salad and pita', price: 540 },
      { cat: 'Light Bites',       name: 'Steam Momo (6 pcs)',    description: 'Ohana-style dumplings with sesame dip', price: 320 },
      { cat: 'Light Bites',       name: 'French Fries',          description: 'Crispy golden fries with ketchup and aioli', price: 280 },
      { cat: 'Light Bites',       name: 'Caprese Salad',         description: 'Buffalo mozzarella, tomato, basil and balsamic glaze', price: 480 },

      // Mains
      { cat: 'Mains',             name: 'Dal Bhat Thali',        description: 'Traditional Nepali set with dal, rice, sabji, achar and papad', price: 580 },
      { cat: 'Mains',             name: 'Pasta Primavera',       description: 'Penne with seasonal vegetables in garlic olive oil or tomato sauce', price: 620 },
      { cat: 'Mains',             name: 'Chicken Sekuwa Plate',  description: 'Marinated grilled chicken with roasted potatoes and salad', price: 720 },
      { cat: 'Mains',             name: 'Mushroom Risotto',      description: 'Creamy Himalayan mushroom risotto with parmesan and truffle oil', price: 680 },
      { cat: 'Mains',             name: 'Buddha Bowl',           description: 'Quinoa, roasted vegetables, chickpeas, tahini dressing and kimchi', price: 640 },

      // Desserts
      { cat: 'Cakes & Desserts',  name: 'Chocolate Fudge Cake',  description: 'Dense chocolate cake with ganache and vanilla ice cream', price: 420 },
      { cat: 'Cakes & Desserts',  name: 'Cheesecake of the Day', description: 'Ask your server for today\'s flavour — always freshly baked', price: 380 },
      { cat: 'Cakes & Desserts',  name: 'Juju Dhau',             description: 'King of yogurt in a clay pot, with rose petals and pistachios', price: 280 },
      { cat: 'Cakes & Desserts',  name: 'Brownie & Ice Cream',   description: 'Warm walnut brownie with two scoops of vanilla ice cream', price: 350 },
    ],
  },
];

/* ── Main seeder ─────────────────────────────────────────── */
async function seed() {
  console.log('\n🏔️  Himbyte Seed Script Starting…\n');

  const results = [];

  for (const data of RESTAURANTS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍  ${data.restaurant.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    /* 1. Restaurant */
    const { data: restaurant, error: rErr } = await supabase
      .from('restaurants')
      .upsert(data.restaurant, { onConflict: 'slug' })
      .select()
      .single();
    if (rErr) fail('insert restaurant', rErr);
    ok(`Restaurant: ${restaurant.name} (${restaurant.id})`, restaurant);
    const rid = restaurant.id;

    /* 2. Auth users + profiles */
    const createdAccounts = [];
    for (const acc of data.accounts) {
      const user = await createUser(acc.email, acc.password, acc.name, acc.role, rid);
      ok(`Account: ${acc.role} — ${acc.email}`, user);
      createdAccounts.push({ ...acc, userId: user.id });
    }

    /* 3. Categories */
    const catRows = data.categories.map((c) => ({ ...c, restaurant_id: rid }));
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .upsert(catRows, { onConflict: 'restaurant_id,name' })
      .select();
    if (catErr) fail('insert categories', catErr);
    ok(`Categories: ${cats.length} created`, cats);
    const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

    /* 4. Menu items */
    const menuRows = data.menuItems.map((item) => ({
      restaurant_id: rid,
      category_id:   catMap[item.cat],
      name:          item.name,
      description:   item.description,
      price:         item.price,
      is_available:  true,
    }));
    const { data: menuResult, error: menuErr } = await supabase
      .from('menu_items')
      .upsert(menuRows, { onConflict: 'restaurant_id,name' })
      .select();
    if (menuErr) fail('insert menu_items', menuErr);
    ok(`Menu items: ${menuResult.length} created`, menuResult);

    /* 5. Tables & Rooms — insert then update with QR URLs */
    const tableRows = data.tables.map((t) => ({ ...t, restaurant_id: rid }));
    const { data: tables, error: tableErr } = await supabase
      .from('tables_rooms')
      .upsert(tableRows, { onConflict: 'restaurant_id,identifier' })
      .select();
    if (tableErr) fail('insert tables_rooms', tableErr);

    // Build QR URLs and update
    const qrUpdates = tables.map((t) => ({
      id: t.id,
      qr_code_url: `${APP_URL}/scan?r=${data.restaurant.slug}&loc=${t.id}`,
    }));
    for (const upd of qrUpdates) {
      await supabase.from('tables_rooms').update({ qr_code_url: upd.qr_code_url }).eq('id', upd.id);
    }
    ok(`Tables/Rooms: ${tables.length} with QR URLs`, tables);

    results.push({
      restaurant: data.restaurant.name,
      slug:       data.restaurant.slug,
      accounts:   createdAccounts,
      tables:     tables.map((t) => ({
        identifier:  t.identifier,
        type:        t.type,
        id:          t.id,
        qr_url:      `${APP_URL}/scan?r=${data.restaurant.slug}&loc=${t.id}`,
      })),
    });

    console.log(`\n  ✅  ${data.restaurant.name} — fully seeded!`);
  }

  /* ── Print summary ─────────────────────────────────── */
  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║      HIMBYTE SEED COMPLETE — SUMMARY      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  for (const r of results) {
    console.log(`\n🏨  ${r.restaurant}`);
    console.log(`    URL: ${APP_URL}/scan?r=${r.slug}&table=1`);
    console.log(`    Dashboard: ${APP_URL}/merchant`);
    console.log('\n    🔐 Accounts:');
    for (const a of r.accounts) {
      console.log(`       ${a.role.padEnd(20)} ${a.email.padEnd(35)} ${a.password}`);
    }
    console.log('\n    📱 QR Codes (sample):');
    for (const t of r.tables.slice(0, 3)) {
      console.log(`       ${t.identifier.padEnd(18)} ${t.qr_url}`);
    }
    if (r.tables.length > 3) console.log(`       … and ${r.tables.length - 3} more`);
  }

  // Save summary to file
  const summaryPath = path.join(__dirname, 'SEED_SUMMARY.md');
  let md = `# Himbyte Seed Summary\n\nGenerated: ${new Date().toISOString()}\n\n`;
  for (const r of results) {
    md += `## ${r.restaurant}\n`;
    md += `- **Slug:** \`${r.slug}\`\n`;
    md += `- **Menu URL:** \`${APP_URL}/menu?r=${r.slug}\`\n\n`;
    md += `### 🔐 Login Accounts\n\n`;
    md += `| Role | Email | Password |\n|------|-------|----------|\n`;
    for (const a of r.accounts) {
      md += `| ${a.role} | \`${a.email}\` | \`${a.password}\` |\n`;
    }
    md += `\n### 📱 Tables & QR Codes\n\n`;
    md += `| Location | Type | QR URL |\n|----------|------|--------|\n`;
    for (const t of r.tables) {
      md += `| ${t.identifier} | ${t.type} | \`${t.qr_url}\` |\n`;
    }
    md += '\n---\n\n';
  }
  fs.writeFileSync(summaryPath, md);
  console.log(`\n📄  Full summary saved to: SEED_SUMMARY.md`);
  console.log('\n🎉  Done! Open the app and log in with the accounts above.\n');
}

seed().catch((err) => {
  console.error('\n💥  Seed failed:', err.message);
  process.exit(1);
});
