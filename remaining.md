# Himbyte — Remaining Features for Production Launch

> Last updated: 12 Apr 2026
> Status: MVP functional, not production-ready

---

## P0 — Critical for Launch

These **must** be done before any paying customer uses the system.

### 1. Server-Side Price Validation (M)

`POST /api/orders` trusts the client-supplied `price_at_time` and computes `total_price` from it. A malicious guest could send `price_at_time: 0` and get free food. The server must look up current `menu_items.price` by `menu_item_id` + `restaurant_id`, verify `is_available`, and compute the total server-side.

- File: `server/src/routes/orders.js`

### 2. Rate Limiting on Public Endpoints (M)

No rate limiting anywhere. Public endpoints (`POST /orders`, `POST /service-requests`, `POST /onboarding/register-owner`) are vulnerable to spam and abuse. Add `express-rate-limit` with sensible limits (e.g., 10 orders/min per IP, 3 registrations/hour per IP).

- File: `server/src/index.js`

### 3. Cross-Tenant Guard on Service Requests (S)

`PATCH /api/service-requests/:id/status` updates by UUID without verifying the service request belongs to the staff member's restaurant. A staff member could update another tenant's service requests if they guess/leak the UUID.

- File: `server/src/routes/service-requests.js`

### 4. Production CORS Lockdown (S)

The CORS callback falls through to `cb(null, true)` for any origin that doesn't match localhost/LAN regex. In production, this should be an explicit allowlist (e.g., `himbyte.com`, the specific Vercel URL).

- File: `server/src/index.js`

### 5. Guest Order Input Validation (M)

Beyond pricing: validate each `menu_item_id` belongs to the specified `restaurant_id`, enforce item availability, reject empty or oversized payloads (e.g., max 50 items), and sanitize `notes`.

- File: `server/src/routes/orders.js`

### 6. Consolidated Database Migration (L)

Migrations 001–004 have schema drift (001 references `tables`/`rooms` separately, later files patch with `IF NOT EXISTS`). A new install must run them in exact order or things break. Create a single consolidated `000_full_schema.sql` for fresh installs, keep incremental migrations for existing deployments.

- Dir: `supabase/migrations/`

---

## P1 — Important for First Paying Customers

These are needed to close the first sale and keep customers from churning.

### 7. SaaS Billing & Subscription Enforcement (XL)

The `restaurants` table has `subscription_status`, `subscription_plan`, `trial_ends_at` columns (from migration 001), but **nothing reads or enforces them**. Need:

- A pricing/plans page
- Stripe or local billing integration
- Middleware that checks subscription status before serving API requests
- Trial expiration logic
- Admin UI to manage subscriptions

### 8. Payment Collection for Orders (XL)

Currently orders go straight to the kitchen with no payment. Nepal venues need:

- eSewa integration
- Khalti integration
- Fonepay QR
- Cash / pay-at-counter option
- Payment status on orders (`paid`, `unpaid`, `partial`)
- Settlement reporting

### 9. Staff Invitation & Management (L)

No way to invite staff, change roles, or deactivate users from the UI. The only user creation path is `seed.js` or the onboarding endpoint (which only creates one `restaurant_admin`). Need:

- Invite staff by email (sends magic link or temporary password)
- Role management UI (promote/demote)
- Deactivate/remove staff
- File: `server/src/routes/onboarding.js`, new `server/src/routes/staff.js`

### 10. Category & Table/Room Management UI (M–L)

No UI to create categories, tables, or rooms. Real venues depend on seed data or manual SQL. Need:

- CRUD pages for categories (with drag-to-reorder priority)
- CRUD pages for tables/rooms
- QR auto-generation when a table/room is created

### 11. Receipts & VAT Invoicing (L)

The marketing/README mentions IRD compliance, but there's no:

- PDF receipt generation
- VAT line item breakdown (13% in Nepal)
- Digital receipt sent to guest email
- Receipt history for merchants
- Export for tax filing

### 12. Push/Email/SMS Notifications (M–L)

Staff rely on keeping the browser open + optional audio chime. Need:

- Web Push notifications for new orders (via Service Worker)
- Email notifications for daily summary
- Optional SMS alerts for high-priority orders (via Sparrow SMS or Aakash SMS — Nepal providers)

### 13. Menu Item Editing in UI (S)

`PATCH /admin/menu-items/:id` exists on the server but `api.js` doesn't expose an `updateMenuItem` function, and the Inventory page only supports add/toggle/delete — no inline edit for name, description, or price.

- Files: `client/src/lib/api.js`, `client/src/pages/merchant/Inventory.jsx`

### 14. Error Boundaries & 404 Page (S–M)

- Unknown routes redirect to `/` (no dedicated 404)
- No React error boundary to catch rendering crashes
- Need a proper 404 page and a global `<ErrorBoundary>` wrapper

### 15. Environment Variable Documentation (S)

`.env.example` is missing several vars used in the codebase:

- `CLIENT_URL` (for strict CORS)
- `VITE_APP_URL` (used in QR code generation)
- `SUPABASE_DB_PASSWORD` (for direct pg migrations)

### 16. Analytics Scalability (M)

Admin analytics loads up to 2,000 orders with nested joins; merchant analytics limits to 800. No date range filters, no pagination. Will degrade noticeably past ~5,000 orders.

- Add date range picker (today, this week, this month, custom)
- Add server-side aggregation instead of client-side reduce
- Consider materialized views or Supabase Edge Functions for heavy analytics

### 17. CI/CD Pipeline (M)

No GitHub Actions, no test runner, no lint-on-push. Need:

- `.github/workflows/ci.yml` (lint + type check + test)
- Vercel auto-deploy for frontend
- Railway auto-deploy for backend
- Branch protection rules

---

## P2 — Nice-to-Have Post-Launch

### 18. Table Bill Management — **implemented (MVP)** · follow-ups below

Shipped in `client/src/pages/merchant/TableBills.jsx` + `server/src/routes/tables.js`:

- **View bill** — drawer with line items, subtotal, running total
- **Equal split** — N-way split with per-person amounts
- **Split by item** — assign each line to Guest 1…N, server sums per group
- **Transfer** — move whole orders to another table (checkboxes; fixed stale-state bug)
- **Settle table** — marks active orders served, clears `running_total`
- **Print** — opens print dialog with venue name, timestamp, escaped HTML

**Still optional / later:** split by transferring individual *order lines* (not whole orders), payment method on settle, PDF download, fiscal receipt fields.

### 19. Image Upload for Menu Items — **implemented** · run SQL once

- **Client:** `client/src/lib/uploadImage.js` resizes to max 800px, outputs WebP, uploads to `menu-images/{restaurantId}/…`
- **UI:** `Inventory.jsx` — camera/file on add row, click-to-replace on each item, **drag-and-drop** on add card and each row
- **Bucket + RLS:** apply `supabase/migrations/005_storage_menu_images.sql` in the Supabase SQL Editor (creates public bucket + staff upload policies)

**If upload fails:** confirm the migration ran and the user is logged in as staff (JWT required for Storage policies).

### 21. Messaging Depth (M)

Customer-to-waiter messages are `service_requests` rows — no threaded conversation, no staff reply, no read receipts. For the "messaging" feature to be a selling point, consider a lightweight chat model or at minimum a staff inbox page.

### 22. Security Hardening (M)

- CAPTCHA on registration / guest check-in
- Request signing or fingerprinting for guest orders
- Helmet CSP headers tuned for SPA
- Input sanitization (XSS prevention on `notes`, `name` fields)
- Audit logging for sensitive operations

### 23. GDPR / Privacy Compliance (L)

No export/delete flows for guest PII (`guest_phone`, `guest_email`, `session_id`). For international hotel chains, need:

- "Delete my data" endpoint
- Data export (JSON/CSV) for guests
- Privacy policy page
- Cookie consent (if analytics are added)

### 24. Performance Polish (M)

- List virtualization for long menus (react-window)
- Image lazy loading with blur placeholders
- API response caching (ETags or SWR)
- Bundle splitting by route

### 25. RLS Policy Audit (M)

Migration 004 adds broad policies (`service_requests_public_read: USING (true)`). Combined with the anon client pattern, validate least-privilege for all tables. Document the RLS story for security reviews.

### 26. README & Documentation (S)

README still references old "Terracotta" palette and `supabase/seed.sql`. Need:

- Accurate setup instructions
- API documentation (Swagger/OpenAPI)
- User guide for restaurant owners
- Video walkthrough

---

## P3 — Future Roadmap

### 27. Multi-Branch / Franchise Support (XL)

Single `restaurant_id` per profile. No chain hierarchy, no cross-venue reporting, no franchise management.

### 28. Advanced KDS (L–XL)

Current KDS is a single view. Future: station routing (grill, bar, dessert), coursing, bump bar hardware support, cooking timers.

### 29. Loyalty & Customer CRM (XL)

No customer accounts, no repeat-visit tracking, no rewards program, no targeted marketing.

### 30. Native Mobile Apps (XL)

Web-only currently. For staff (order notifications) and guests (order history), native iOS/Android apps or a PWA with offline support would be valuable.

### 31. Printer & POS Hardware Integration (L–XL)

No ESC/POS thermal printer support, no Sunmi device integration, no cash drawer trigger. Kitchen is browser-only KDS. Many Nepal venues need physical ticket printing.

### 32. Public API & Webhooks (L–XL)

No partner API keys, no outbound webhooks for ERP/accounting integration. Needed for larger venues with existing systems (Tally, custom accounting).

### 33. Reservation System (L)

No table reservation, no waitlist management, no estimated wait times.

### 34. Inventory & Stock Tracking (L)

Menu items have `is_available` toggle but no actual stock counts, low-stock alerts, or purchase order management.

### 35. Multi-Language Menu (M)

Menus are in one language only. Tourist-heavy venues need English + Nepali (+ possibly Chinese, Korean, Japanese).

---

## Quick Reference: Effort Key


| Tag | Meaning     | Rough Dev Time |
| --- | ----------- | -------------- |
| S   | Small       | 1–3 hours      |
| M   | Medium      | 1–3 days       |
| L   | Large       | 1–2 weeks      |
| XL  | Extra Large | 2–6 weeks      |


## Priority Summary


| Priority | Count    | Focus                                   |
| -------- | -------- | --------------------------------------- |
| **P0**   | 6 items  | Security, data integrity, schema health |
| **P1**   | 11 items | Revenue, operations, staff workflow     |
| **P2**   | 9 items  | Polish, compliance, performance         |
| **P3**   | 9 items  | Market expansion, hardware, scale       |


