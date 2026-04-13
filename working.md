# Himbyte — How the app works (step by step)

This document explains how **Himbyte OS** is wired together: one **React (Vite)** client, one **Express** API, and **Supabase** (Postgres + Auth + Realtime). It also lists **demo logins** seeded in the database.

---

## 1. Why it looked like “Supabase was not configured”

Two common causes:

### A) Frontend was not reading your root `.env`

Vite’s default `envDir` is the `**client/`** folder. If you only created `**himbyte/.env`** at the repo root (correct for the server), the browser bundle **did not** see `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so the client thought it was in **demo mode** (`DEMO_MODE = true`).

**Fix (already in the repo):** `client/vite.config.js` sets `envDir` to the **parent directory** so **one** `.env` at `**himbyte/.env`** loads for both:

- Server: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as above, with the `VITE_` prefix)

After changing `.env`, **restart Vite** (env is read at dev-server startup).

### B) Invisible spaces in pasted keys

Keys copied from the Supabase dashboard sometimes include leading/trailing spaces. The server now **trims** `SUPABASE_`* and `VITE_`* keys after load; the client trims `VITE_`* at runtime.

---

## 2. Environment file checklist (`himbyte/.env`)

Create `**himbyte/.env`** (never commit it). Minimum for **full** behaviour:


| Variable                    | Used by     | Purpose                                                                                        |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Server      | Project URL                                                                                    |
| `SUPABASE_ANON_KEY`         | Server      | Public key; server falls back to this if no service role                                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Server      | **Secret.** Bypasses RLS for guest orders, onboarding (`/register`), and reliable staff writes |
| `VITE_SUPABASE_URL`         | Client      | Same URL as `SUPABASE_URL`                                                                     |
| `VITE_SUPABASE_ANON_KEY`    | Client      | Same as `SUPABASE_ANON_KEY` (safe in browser)                                                  |
| `PORT`                      | Server      | API port (default `3001`)                                                                      |
| `APP_URL`                   | Server / QR | Public site URL for QR links (e.g. `http://localhost:5173`)                                    |


**Quick verification**

1. Start API: `cd server && node src/index.js`
2. Open: `http://localhost:3001/api/health`
  You should see `"demo": false` and `"supabase": { "configured": true, "url": "https://....supabase.co", "has_service_role_key": true, ... }`.
3. Start client: `cd client && npx vite`
4. In the browser console, `import.meta.env.VITE_SUPABASE_URL` should be your project URL (or check Network tab: requests to `*.supabase.co`).

---

## 3. How data flows (architecture)

```
Browser (Vite, port 5173)
  ├─ /api/*  →  proxy  →  Express (port 3001)
  │                        └─ Supabase JS (service role or anon + user JWT)
  └─ *.supabase.co  →  Supabase Auth + Realtime + Postgres (RLS)
```

- **Guests (QR menu):** No Supabase login. They enter **phone + email** once per table context; orders are created via the **API** with `session_id`, `guest_phone`, `guest_email`.
- **Staff / owners:** **Supabase Auth** (email + password). The SPA stores the JWT in `localStorage` as `himbyte_token` and sends `Authorization: Bearer …` to the API.
- **Realtime:** The client subscribes to `orders` with filters (`restaurant_id` for staff, `session_id` for guests) so status changes (e.g. pending → approved) appear without refresh.

---

## 4. End-to-end user flows

### 4.1 Customer (guest)

1. Open a menu URL, e.g.
  `http://localhost:5173/menu/hotel-tashi-delek?table=T1`  
   (`table` can be a `tables_rooms.identifier` or id, depending on how QR was generated.)
2. If Supabase is configured, a **guest check-in** modal asks for **phone** and **email** (stored in `sessionStorage` for that venue + table).
3. Browse categories and items (loaded from `/api/menu/...` backed by Postgres).
4. Add to cart → **Place order** → `POST /api/orders` creates `orders.status = 'pending'` and line items.
5. UI shows **waiting for staff approval** until status changes to `approved` (Realtime updates the status bar).
6. When staff **approves**, the server adds `orders.total_price` to `**tables_rooms.running_total`** for that table (running bill for the table).

### 4.2 Staff / restaurant admin

1. Go to `http://localhost:5173/login` and sign in (see **§6 Demo accounts**).
2. **Merchant** routes live under `/merchant` (dashboard, order gate, kitchen, inventory, analytics, QR codes).
3. **Order Gate:** Lists `pending` orders; **Approve** / **Cancel**; Realtime keeps the list fresh.
4. **Kitchen KDS:** Works on `approved` / `preparing` orders and advances status.

### 4.3 Super admin

- Same login page; if the user’s `profiles.role` is `super_admin`, after login they are sent to `**/admin`**.

### 4.4 New restaurant (self-serve)

1. `http://localhost:5173/register`
2. Fills business + owner email/password.
3. `**SUPABASE_SERVICE_ROLE_KEY` must be set on the server** — the API creates the Auth user, `restaurants` row, and `profiles` (`restaurant_admin`) in one transaction.

---

## 5. Database & schema

- Canonical schema lives in `**.cursorrules`** in the repo (tables: `restaurants`, `profiles`, `categories`, `menu_items`, `tables_rooms`, `orders`, `order_items`, `service_requests`).
- SQL migrations under `**supabase/migrations/`** (e.g. guest columns + `tables_rooms.running_total`) should be applied to your Supabase project (SQL editor or CLI).

---

## 6. Demo accounts (seeded in Supabase)

These were created by the seed SQL for the two demo tenants. Use them on `**/login`** (not for guest menus).


| Role             | Restaurant                   | Email                 | Password          |
| ---------------- | ---------------------------- | --------------------- | ----------------- |
| Restaurant admin | Hotel Tashi Delek, Dingboche | `admin@tashidelek.np` | `TashiDelek@2026` |
| Staff            | Hotel Tashi Delek            | `staff@tashidelek.np` | `TashiDelek@2026` |
| Restaurant admin | Ohana Cafe, Boudha           | `admin@ohanacafe.np`  | `OhanaCafe@2026`  |
| Staff            | Ohana Cafe                   | `staff@ohanacafe.np`  | `OhanaCafe@2026`  |
| Super admin      | Himbyte (all tenants)        | `admin@himbyte.app`   | `HimByte@2026`    |


**Slugs for menus (examples):**

- `hotel-tashi-delek` — e.g. `/menu/hotel-tashi-delek?table=T1`
- `ohana-cafe` — e.g. `/menu/ohana-cafe?table=T1`

If these accounts do not exist yet, run `**node seed.js`** from the repo root (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`). The seed resets passwords for existing demo emails via the Admin API.

If you still see **“Invalid login credentials”** after seeding, users may have been created earlier with incompatible password hashes (e.g. raw SQL). From the repo root run:

```bash
npm run fix:demo-auth
```

That uses the service role to **create or update** every demo Auth user, sync `profiles`, and set passwords per **§6** (plus legacy `@tashidelek.com` / `@ohanacafe.com` aliases). If tenant accounts are skipped with “no restaurant row”, run `**node seed.js`** once, then run `**npm run fix:demo-auth`** again. Then try `/login` again.

---

## 7. Local development commands

From repo root `**himbyte/`**:

```bash
# Terminal 1 — API
cd server && node src/index.js

# Terminal 2 — Client
cd client && npx vite
```

Or use root `package.json` scripts if you prefer a single command.

---

## 8. Troubleshooting


| Symptom                                                                             | What to check                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client acts like demo (no guest modal, no real data)                                | Root `.env` has `VITE_SUPABASE_*`; **restart Vite**                                                                                                                                                                                                                     |
| API returns 401 on staff routes                                                     | Log in again; token in `localStorage` `himbyte_token`                                                                                                                                                                                                                   |
| `501` on `/register`                                                                | `SUPABASE_SERVICE_ROLE_KEY` missing on **server** `.env`                                                                                                                                                                                                                |
| `403` / empty data                                                                  | RLS policies and `restaurant_id` on `profiles`                                                                                                                                                                                                                          |
| Health shows `demo: true`                                                           | `SUPABASE_URL` empty or not loaded — confirm `.env` path and **restart API**                                                                                                                                                                                            |
| **Invalid login credentials** (known demo emails)                                   | Run `**npm run fix:demo-auth`** or `**node seed.js`** so GoTrue stores a valid password; confirm `VITE_SUPABASE_`* and **restart Vite**                                                                                                                                 |
| `**.com` works but `.np` does not** (or Admin API: *Database error checking email*) | Run `**supabase/scripts/repair-orphan-identities.sql`**: run diagnostic (A) first, then demo-only (B) + (C) (deletes those five emails from `auth.users` / `auth.identities`), then `**npm run fix:demo-auth`** again. The old single `DELETE` often matched zero rows. |


---

## 9. Security reminders

- Never commit `**.env`** or expose `**SUPABASE_SERVICE_ROLE_KEY`** to the browser.
- Only `**anon`** + **user JWT** belong in the Vite bundle (`VITE_`*).
- Production: set `APP_URL` to your real domain for QR codes and tighten CORS on the API.

---

*Last updated for the monorepo layout: single root `.env`, Vite `envDir` = repo root, trimmed Supabase env vars.*