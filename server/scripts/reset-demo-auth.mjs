/**
 * Ensure demo Auth users exist with known passwords (Supabase Admin API).
 *
 * Fixes:
 *   • Users never created, or created only in SQL with incompatible password hashes
 *   • Password drift / re-seed gaps
 *   • Legacy @*.com emails (same roles as @*.np)
 *
 * Requires: repo root .env — SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run: npm run fix:demo-auth   (from repo root or server/)
 *
 * Tenant rows need `restaurants` for slugs `hotel-tashi-delek` and `ohana-cafe`.
 * If missing, run `node seed.js` from repo root first.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (typeof process.env[k] === 'string') process.env[k] = process.env[k].trim();
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in repo root .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** slug null + role super_admin => restaurant_id null */
const ACCOUNTS = [
  { email: 'admin@tashidelek.np', password: 'TashiDelek@2026', full_name: 'Hotel Tashi Delek Admin', role: 'restaurant_admin', slug: 'hotel-tashi-delek' },
  { email: 'staff@tashidelek.np', password: 'TashiDelek@2026', full_name: 'Tashi Delek Staff', role: 'staff', slug: 'hotel-tashi-delek' },
  { email: 'admin@tashidelek.com', password: 'TashiDelek@2026', full_name: 'Hotel Tashi Delek Admin', role: 'restaurant_admin', slug: 'hotel-tashi-delek' },
  { email: 'staff@tashidelek.com', password: 'TashiDelek@2026', full_name: 'Tashi Delek Staff', role: 'staff', slug: 'hotel-tashi-delek' },
  { email: 'admin@ohanacafe.np', password: 'OhanaCafe@2026', full_name: 'Ohana Cafe Admin', role: 'restaurant_admin', slug: 'ohana-cafe' },
  { email: 'staff@ohanacafe.np', password: 'OhanaCafe@2026', full_name: 'Ohana Cafe Staff', role: 'staff', slug: 'ohana-cafe' },
  { email: 'admin@ohanacafe.com', password: 'OhanaCafe@2026', full_name: 'Ohana Cafe Admin', role: 'restaurant_admin', slug: 'ohana-cafe' },
  { email: 'staff@ohanacafe.com', password: 'OhanaCafe@2026', full_name: 'Ohana Cafe Staff', role: 'staff', slug: 'ohana-cafe' },
  { email: 'admin@himbyte.app', password: 'HimByte@2026', full_name: 'Himbyte Super Admin', role: 'super_admin', slug: null },
];

async function listAllAuthUsers() {
  const all = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < perPage) break;
    page += 1;
  }
  return all;
}

async function resolveRestaurantIds() {
  const slugs = [...new Set(ACCOUNTS.map((a) => a.slug).filter(Boolean))];
  if (!slugs.length) return {};
  const { data, error } = await supabase.from('restaurants').select('id, slug').in('slug', slugs);
  if (error) throw error;
  const map = Object.fromEntries((data || []).map((r) => [r.slug, r.id]));
  for (const s of slugs) {
    if (!map[s]) console.warn(`\n⚠  No restaurant with slug "${s}" — tenant demo accounts for that slug will fail. Run: node seed.js\n`);
  }
  return map;
}

async function main() {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();
  console.log(`Supabase: ${host}\n`);

  const restaurantIds = await resolveRestaurantIds();
  let byEmail = new Map((await listAllAuthUsers()).map((u) => [String(u.email || '').toLowerCase(), u]));

  for (const acc of ACCOUNTS) {
    const key = acc.email.toLowerCase();
    const restaurant_id = acc.slug ? restaurantIds[acc.slug] : null;
    if (acc.slug && !restaurant_id) {
      console.log(`  ⊘  Skip (no restaurant row): ${acc.email}`);
      process.exitCode = 1;
      continue;
    }

    let user = byEmail.get(key);
    const existedBeforeCreate = !!user;
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: key,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      });
      if (error) {
        // User may already exist (GoTrue sometimes returns "Database error checking email")
        byEmail = new Map((await listAllAuthUsers()).map((u) => [String(u.email || '').toLowerCase(), u]));
        user = byEmail.get(key);
        if (!user) {
          console.error(`  ✗  create ${acc.email}:`, error.message);
          if (String(error.message).includes('Database error checking email')) {
            console.error(
              '     Hint: run supabase/scripts/repair-orphan-identities.sql — diagnostics (A), then demo-only deletes (B)+(C) in SQL Editor, then re-run this script.',
            );
          }
          process.exitCode = 1;
          continue;
        }
        console.log(`  ↻  User already in Auth, resetting password: ${acc.email}`);
      } else {
        user = data.user;
        byEmail.set(key, user);
        console.log(`  +  Created Auth user: ${acc.email}`);
      }
    }

    const { error: pwdErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: acc.password,
      email_confirm: true,
    });
    if (pwdErr) {
      console.error(`  ✗  password ${acc.email}:`, pwdErr.message);
      process.exitCode = 1;
      continue;
    }
    if (existedBeforeCreate) {
      console.log(`  ✓  Password set: ${acc.email}`);
    }

    const normEmail = String(acc.email).trim().toLowerCase();
    const { error: pErr } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        restaurant_id,
        full_name: acc.full_name,
        role: acc.role,
        email: normEmail,
      },
      { onConflict: 'id' },
    );
    if (pErr) {
      console.error(`  ✗  profile ${acc.email}:`, pErr.message);
      process.exitCode = 1;
    } else {
      console.log(`     profile: ${acc.role}${restaurant_id ? ` → ${acc.slug}` : ''}`);
    }
  }

  console.log('\nDone. Use .np or .com demo emails with the passwords in working.md §6.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
